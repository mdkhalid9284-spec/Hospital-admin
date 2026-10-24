import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IPatient, UserRole } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';

export class PatientService {
  public static async getAll(
    query: { search?: string; limit?: number; offset?: number },
    actorRole: UserRole,
    actorDoctorId?: string
  ): Promise<{ patients: Partial<IPatient>[]; total: number }> {
    let list = [...db.patients];

    // If doctor, filter to assigned patients unless searching
    if (actorRole === 'doctor' && actorDoctorId) {
      list = list.filter((p) => p.assignedDoctorId === actorDoctorId);
    }

    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(s) ||
          p.patientCode.toLowerCase().includes(s) ||
          p.phone.includes(s) ||
          p.email.toLowerCase().includes(s)
      );
    }

    const total = list.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paged = list.slice(offset, offset + limit);

    // Filter fields according to role privacy
    const sanitized = paged.map((p) => {
      if (actorRole === 'billing') {
        return {
          id: p.id,
          patientCode: p.patientCode,
          fullName: p.fullName,
          phone: p.phone,
          email: p.email,
          currentAdmissionId: p.currentAdmissionId,
        };
      }
      return p;
    });

    return { patients: sanitized, total };
  }

  public static async getById(patientId: string): Promise<IPatient> {
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${patientId}' was not found.`, 404, 'PATIENT_NOT_FOUND');
    }
    return patient;
  }

  public static async create(
    data: Omit<IPatient, 'id' | 'userId' | 'patientCode' | 'createdAt' | 'updatedAt'>,
    actor: { id: string; name: string; role: any }
  ): Promise<IPatient> {
    const existingEmail = db.patients.find((p) => p.email.toLowerCase() === data.email.toLowerCase());
    if (existingEmail) {
      throw new AppError('A patient with this email already exists.', 409, 'PATIENT_EMAIL_EXISTS');
    }

    const patientId = `pat-${uuidv4().substring(0, 8)}`;
    const patientCode = `PAT-${1000 + db.patients.length + 1}`;

    const newPatient: IPatient = {
      ...data,
      id: patientId,
      userId: `usr-${uuidv4().substring(0, 8)}`,
      patientCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.patients.push(newPatient);

    logAuditEvent(actor, 'PATIENT_CREATED', 'Patient', newPatient.id, 'SUCCESS', undefined, {
      patientCode: newPatient.patientCode,
      fullName: newPatient.fullName,
    });

    return newPatient;
  }

  public static async update(
    patientId: string,
    updates: Partial<IPatient>,
    actor: { id: string; name: string; role: any }
  ): Promise<IPatient> {
    const patient = await this.getById(patientId);

    Object.assign(patient, updates, { updatedAt: new Date().toISOString() });

    logAuditEvent(actor, 'PATIENT_UPDATED', 'Patient', patient.id, 'SUCCESS', undefined, updates);

    return patient;
  }
}
