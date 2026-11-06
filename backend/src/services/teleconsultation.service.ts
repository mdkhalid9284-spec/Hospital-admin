import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { ITeleconsultation, UserRole } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { config } from '../config/index.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';

export interface TeleconsultActor {
  id: string;
  fullName: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
}

const roomSlug = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const buildJoinUrl = (roomName: string): string =>
  `${config.teleconsultation.baseUrl}/${encodeURIComponent(roomName)}`;

export class TeleconsultationService {
  private static canAccess(session: ITeleconsultation, actor: TeleconsultActor): boolean {
    if (actor.role === 'admin') return true;
    if (actor.role === 'patient') return session.patientId === actor.patientId;
    if (actor.role === 'doctor') return session.doctorId === actor.doctorId;
    return false;
  }

  public static listForUser(actor: TeleconsultActor): ITeleconsultation[] {
    if (actor.role === 'admin') return [...db.teleconsultations];
    if (actor.role === 'patient') {
      return db.teleconsultations.filter((session) => session.patientId === actor.patientId);
    }
    if (actor.role === 'doctor') {
      return db.teleconsultations.filter((session) => session.doctorId === actor.doctorId);
    }
    return [];
  }

  public static getById(sessionId: string, actor: TeleconsultActor): ITeleconsultation {
    const session = db.teleconsultations.find((item) => item.id === sessionId);
    if (!session) {
      throw new AppError(
        `Teleconsultation with ID '${sessionId}' was not found.`,
        404,
        'TELECONSULTATION_NOT_FOUND'
      );
    }
    if (!this.canAccess(session, actor)) {
      throw new AppError(
        'Access denied. You are not a participant in this consultation.',
        403,
        'IDOR_FORBIDDEN'
      );
    }
    return session;
  }

  /**
   * Starts (or reuses) a real video room. No fake counters: the returned
   * joinUrl opens the actual configured provider (Jitsi Meet by default).
   */
  public static start(
    input: { patientId?: string; doctorId?: string; appointmentId?: string },
    actor: TeleconsultActor
  ): ITeleconsultation {
    const appointment = input.appointmentId
      ? db.appointments.find((item) => item.id === input.appointmentId)
      : undefined;

    if (input.appointmentId && !appointment) {
      throw new AppError(
        `Appointment with ID '${input.appointmentId}' was not found.`,
        404,
        'APPOINTMENT_NOT_FOUND'
      );
    }

    const patientId =
      actor.role === 'patient'
        ? actor.patientId
        : input.patientId || appointment?.patientId;

    if (!patientId) {
      throw new AppError('A patientId is required to start a video call.', 400, 'MISSING_PATIENT');
    }

    const patient = db.patients.find((item) => item.id === patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    if (actor.role === 'patient' && patient.id !== actor.patientId) {
      throw new AppError(
        'Access denied. You can only start your own video consultation.',
        403,
        'IDOR_FORBIDDEN'
      );
    }

    let doctorId: string | undefined;
    if (actor.role === 'doctor') {
      doctorId = actor.doctorId;
      const hasRelationship =
        patient.assignedDoctorId === doctorId ||
        db.appointments.some((a) => a.patientId === patient.id && a.doctorId === doctorId);
      if (!hasRelationship) {
        throw new AppError(
          'Access denied. You can only start video calls for your assigned patients.',
          403,
          'IDOR_FORBIDDEN'
        );
      }
    } else {
      doctorId =
        input.doctorId ||
        appointment?.doctorId ||
        patient.assignedDoctorId ||
        db.appointments.find(
          (a) => a.patientId === patient.id && a.status !== 'Cancelled'
        )?.doctorId;
    }

    if (!doctorId) {
      throw new AppError(
        'No doctor is assigned to this patient yet, so a video room cannot be routed. Book an appointment first.',
        400,
        'NO_DOCTOR_ASSIGNED'
      );
    }

    const doctor = db.doctors.find((item) => item.id === doctorId && item.isActive);
    if (!doctor) {
      throw new AppError(
        `Doctor with ID '${doctorId}' not found or inactive.`,
        404,
        'DOCTOR_NOT_FOUND'
      );
    }

    const active = db.teleconsultations.find(
      (session) =>
        session.patientId === patient.id &&
        session.doctorId === doctor.id &&
        session.status === 'Active'
    );
    if (active) return active;

    const roomName = roomSlug(
      `HospitalCare-${patient.patientCode || patient.id}-${uuidv4().substring(0, 8)}`
    );

    const now = new Date().toISOString();
    const session: ITeleconsultation = {
      id: `tele-${uuidv4().substring(0, 8)}`,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      roomName,
      joinUrl: buildJoinUrl(roomName),
      provider: config.teleconsultation.provider,
      status: 'Active',
      startedBy: actor.id,
      startedAt: now,
      endedAt: null,
    };

    db.teleconsultations.unshift(session);

    logAuditEvent(
      { id: actor.id, name: actor.fullName, role: actor.role },
      'TELECONSULTATION_STARTED',
      'Teleconsultation',
      session.id,
      'SUCCESS',
      undefined,
      {
        patientId: patient.id,
        doctorId: doctor.id,
        roomName,
      }
    );

    return session;
  }

  public static end(sessionId: string, actor: TeleconsultActor): ITeleconsultation {
    const session = this.getById(sessionId, actor);
    if (session.status === 'Ended') return session;

    session.status = 'Ended';
    session.endedAt = new Date().toISOString();

    logAuditEvent(
      { id: actor.id, name: actor.fullName, role: actor.role },
      'TELECONSULTATION_ENDED',
      'Teleconsultation',
      session.id,
      'SUCCESS'
    );

    return session;
  }
}
