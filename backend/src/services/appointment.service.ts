import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IAppointment, AppointmentStatus } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { NotificationService } from './notification.service.js';

export class AppointmentService {
  public static async getDoctorAvailableSlots(
    doctorId: string,
    date: string
  ): Promise<{ allSlots: string[]; bookedSlots: string[]; availableSlots: string[] }> {
    const doctor = db.doctors.find((d) => d.id === doctorId && d.isActive);
    if (!doctor) {
      throw new AppError(`Doctor with ID '${doctorId}' not found.`, 404, 'DOCTOR_NOT_FOUND');
    }

    // Standard clinical day slots (09:00 to 17:00 in 30 min intervals)
    const allSlots = [
      '09:00 - 09:30',
      '09:30 - 10:00',
      '10:00 - 10:30',
      '10:30 - 11:00',
      '11:00 - 11:30',
      '11:30 - 12:00',
      '14:00 - 14:30',
      '14:30 - 15:00',
      '15:00 - 15:30',
      '15:30 - 16:00',
      '16:00 - 16:30',
      '16:30 - 17:00',
    ];

    const booked = db.appointments
      .filter(
        (a) =>
          a.doctorId === doctorId &&
          a.appointmentDate === date &&
          a.status !== 'Cancelled'
      )
      .map((a) => a.timeSlot);

    const availableSlots = allSlots.filter((slot) => !booked.includes(slot));

    return { allSlots, bookedSlots: booked, availableSlots };
  }

  public static async bookAppointment(
    data: {
      patientId: string;
      doctorId: string;
      appointmentDate: string;
      timeSlot: string;
      reason: string;
      notes?: string;
    },
    actor: { id: string; name: string; role: any }
  ): Promise<IAppointment> {
    const patient = db.patients.find((p) => p.id === data.patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${data.patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    const doctor = db.doctors.find((d) => d.id === data.doctorId && d.isActive);
    if (!doctor) {
      throw new AppError(`Doctor with ID '${data.doctorId}' not found or inactive.`, 404, 'DOCTOR_NOT_FOUND');
    }

    // Check double-booking lock
    const existing = db.appointments.find(
      (a) =>
        a.doctorId === data.doctorId &&
        a.appointmentDate === data.appointmentDate &&
        a.timeSlot === data.timeSlot &&
        a.status !== 'Cancelled'
    );

    if (existing) {
      throw new AppError(
        'This appointment slot is no longer available. Please select another time.',
        409,
        'SLOT_UNAVAILABLE'
      );
    }

    const appointmentId = `apt-${uuidv4().substring(0, 8)}`;
    const appointmentCode = `APT-${9000 + db.appointments.length + 1}`;

    const newAppointment: IAppointment = {
      id: appointmentId,
      appointmentCode,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      appointmentDate: data.appointmentDate,
      timeSlot: data.timeSlot,
      reason: data.reason,
      status: 'Confirmed', // Direct confirmed on booking for seamless flow
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    db.appointments.unshift(newAppointment);

    logAuditEvent(actor, 'APPOINTMENT_BOOKED', 'Appointment', newAppointment.id, 'SUCCESS', undefined, {
      patientId: patient.id,
      doctorId: doctor.id,
      date: data.appointmentDate,
      slot: data.timeSlot,
    });

    NotificationService.send({
      recipientId: doctor.userId,
      recipientRole: 'doctor',
      title: 'New Appointment Scheduled',
      message: `Appointment booked with ${patient.fullName} for ${data.appointmentDate} at ${data.timeSlot}.`,
      type: 'INFO',
    });

    return newAppointment;
  }

  public static async updateStatus(
    appointmentId: string,
    status: AppointmentStatus,
    notes?: string,
    actor?: { id: string; name: string; role: any }
  ): Promise<IAppointment> {
    const apt = db.appointments.find((a) => a.id === appointmentId);
    if (!apt) {
      throw new AppError(`Appointment with ID '${appointmentId}' not found.`, 404, 'APPOINTMENT_NOT_FOUND');
    }

    apt.status = status;
    if (notes) apt.notes = notes;

    if (actor) {
      logAuditEvent(actor, 'APPOINTMENT_STATUS_UPDATED', 'Appointment', apt.id, 'SUCCESS', undefined, {
        newStatus: status,
      });
    }

    return apt;
  }

  public static async getByPatientId(patientId: string): Promise<IAppointment[]> {
    return db.appointments.filter((a) => a.patientId === patientId);
  }

  public static async getByDoctorId(doctorId: string): Promise<IAppointment[]> {
    return db.appointments.filter((a) => a.doctorId === doctorId);
  }

  public static async getAll(): Promise<IAppointment[]> {
    return db.appointments;
  }
}
