import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IAppointment, AppointmentStatus, IDoctor } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { NotificationService } from './notification.service.js';
import { DAY_NAMES, todayISODate } from '../utils/date.js';

/** The single source of truth for bookable clinical slots. */
export const STANDARD_TIME_SLOTS = [
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

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const slotLockKey = (doctorId: string, date: string, slot: string): string =>
  `${doctorId}|${date}|${slot}`;

export class AppointmentService {
  /**
   * Per-(doctor, date, slot) mutex. Node is single-threaded, but making the
   * critical section explicit means the check-then-insert can never interleave
   * if the implementation later gains an await, and it documents the atomic
   * guarantee required for conflict-free booking.
   */
  private static slotLocks = new Map<string, Promise<unknown>>();

  private static async withSlotLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.slotLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    this.slotLocks.set(key, tail);

    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.slotLocks.get(key) === tail) {
        this.slotLocks.delete(key);
      }
    }
  }

  private static dayNameFor(date: string): string {
    // Parsed as local midnight so the weekday matches the calendar date shown
    // to the user (no UTC drift).
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return '';
    return DAY_NAMES[parsed.getDay()];
  }

  public static isDoctorAvailableOn(doctor: IDoctor, date: string): boolean {
    const day = this.dayNameFor(date);
    return Boolean(day) && doctor.availableDays.includes(day);
  }

  /** Throws a descriptive AppError when a slot cannot be booked. */
  private static assertSlotIsBookable(doctor: IDoctor, date: string, slot: string): void {
    if (!DATE_PATTERN.test(date)) {
      throw new AppError('Appointment date must use the YYYY-MM-DD format.', 400, 'INVALID_DATE');
    }
    if (date < todayISODate()) {
      throw new AppError('Appointments cannot be booked for a past date.', 400, 'DATE_IN_PAST');
    }
    if (!STANDARD_TIME_SLOTS.includes(slot)) {
      throw new AppError(
        `'${slot}' is not a valid consultation slot. Choose one of the standard 30-minute slots.`,
        400,
        'INVALID_TIME_SLOT'
      );
    }
    if (!this.isDoctorAvailableOn(doctor, date)) {
      throw new AppError(
        `${doctor.fullName} does not hold clinics on ${this.dayNameFor(date)}. Available days: ${doctor.availableDays.join(', ')}.`,
        409,
        'DOCTOR_NOT_AVAILABLE'
      );
    }

    const existing = db.appointments.find(
      (a) =>
        a.doctorId === doctor.id &&
        a.appointmentDate === date &&
        a.timeSlot === slot &&
        a.status !== 'Cancelled'
    );

    if (existing) {
      throw new AppError(
        `That time is no longer available: ${doctor.fullName} already has an appointment on ${date} at ${slot}. Please choose another slot.`,
        409,
        'SLOT_UNAVAILABLE'
      );
    }
  }

  public static async getDoctorAvailableSlots(
    doctorId: string,
    date: string
  ): Promise<{
    allSlots: string[];
    bookedSlots: string[];
    availableSlots: string[];
    isDoctorAvailable: boolean;
    date: string;
  }> {
    const doctor = db.doctors.find((d) => d.id === doctorId && d.isActive);
    if (!doctor) {
      throw new AppError(`Doctor with ID '${doctorId}' not found.`, 404, 'DOCTOR_NOT_FOUND');
    }
    if (!date || !DATE_PATTERN.test(date)) {
      throw new AppError('A valid date (YYYY-MM-DD) is required.', 400, 'INVALID_DATE');
    }

    const doctorAvailable = this.isDoctorAvailableOn(doctor, date);

    const booked = db.appointments
      .filter(
        (a) =>
          a.doctorId === doctorId &&
          a.appointmentDate === date &&
          a.status !== 'Cancelled'
      )
      .map((a) => a.timeSlot);

    const availableSlots = doctorAvailable
      ? STANDARD_TIME_SLOTS.filter((slot) => !booked.includes(slot))
      : [];

    return {
      allSlots: STANDARD_TIME_SLOTS,
      bookedSlots: booked,
      availableSlots,
      isDoctorAvailable: doctorAvailable,
      date,
    };
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

    // Fail fast outside the lock with the same validation used inside it.
    this.assertSlotIsBookable(doctor, data.appointmentDate, data.timeSlot);

    const lockKey = slotLockKey(doctor.id, data.appointmentDate, data.timeSlot);

    return this.withSlotLock(lockKey, async () => {
      // Authoritative re-check performed while holding the slot lock.
      this.assertSlotIsBookable(doctor, data.appointmentDate, data.timeSlot);

      const appointmentId = `apt-${uuidv4().substring(0, 8)}`;
      const nextNumber = 9000 + db.appointments.length + 1;
      const appointmentCode = `APT-${nextNumber}`;

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
        status: 'Confirmed',
        notes: data.notes,
        createdAt: new Date().toISOString(),
      };

      // Synchronous mutation immediately after the re-check: no await between
      // verification and insert, so no competing request can slip through.
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
    });
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

    // Re-activating a previously cancelled appointment must not silently
    // double-book the doctor: the slot may have been taken in the meantime.
    if (apt.status === 'Cancelled' && status !== 'Cancelled') {
      const conflicting = db.appointments.find(
        (other) =>
          other.id !== apt.id &&
          other.doctorId === apt.doctorId &&
          other.appointmentDate === apt.appointmentDate &&
          other.timeSlot === apt.timeSlot &&
          other.status !== 'Cancelled'
      );
      if (conflicting) {
        throw new AppError(
          `Cannot restore this appointment: the slot on ${apt.appointmentDate} at ${apt.timeSlot} has already been rebooked.`,
          409,
          'SLOT_UNAVAILABLE'
        );
      }
    }

    const previousStatus = apt.status;
    apt.status = status;
    if (notes !== undefined) apt.notes = notes;

    if (actor) {
      logAuditEvent(actor, 'APPOINTMENT_STATUS_UPDATED', 'Appointment', apt.id, 'SUCCESS', undefined, {
        previousStatus,
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
