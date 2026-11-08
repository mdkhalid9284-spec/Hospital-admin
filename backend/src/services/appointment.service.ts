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

const parseTime = (value: string | undefined): number | null => {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const slotBounds = (slot: string): { start: number; end: number } | null => {
  const [rawStart, rawEnd] = slot.split('-').map((part) => part.trim());
  const start = parseTime(rawStart);
  const end = parseTime(rawEnd);
  if (start === null || end === null || end <= start) return null;
  return { start, end };
};

/** True when two 30-minute consultation slots share any minute. */
const slotsOverlap = (a: string, b: string): boolean => {
  if (a === b) return true;
  const left = slotBounds(a);
  const right = slotBounds(b);
  if (!left || !right) return false;
  return left.start < right.end && right.start < left.end;
};

const slotKeys = (
  patientId: string,
  doctorId: string,
  date: string,
  slot: string
): { doctorSlotKey: string; patientSlotKey: string } => ({
  doctorSlotKey: `${doctorId}|${date}|${slot}`,
  patientSlotKey: `${patientId}|${date}|${slot}`,
});

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

    await previous.catch(() => undefined);
    try {
      return await task();
    } finally {
      release();
      if (this.slotLocks.get(key) === tail) {
        this.slotLocks.delete(key);
      }
    }
  }

  /** Acquires several slot locks in a stable order to prevent deadlocks. */
  private static async withSlotLocks<T>(keys: string[], task: () => Promise<T>): Promise<T> {
    const unique = Array.from(new Set(keys)).sort();
    const run = (index: number): Promise<T> => {
      if (index >= unique.length) return task();
      return this.withSlotLock(unique[index], () => run(index + 1));
    };
    return run(0);
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

  /**
   * Throws a descriptive AppError when a slot cannot be booked.
   *
   * Both the doctor and the patient must be free: booking the same patient
   * twice at the same time is an overwrite bug, even when the doctors differ.
   */
  private static assertSlotIsBookable(
    doctor: IDoctor,
    date: string,
    slot: string,
    options: { patientId?: string; excludeAppointmentId?: string; allowPast?: boolean } = {}
  ): void {
    if (!DATE_PATTERN.test(date)) {
      throw new AppError('Appointment date must use the YYYY-MM-DD format.', 400, 'INVALID_DATE');
    }
    if (!options.allowPast && date < todayISODate()) {
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

    const activeAppointments = db.appointments.filter(
      (a) => a.id !== options.excludeAppointmentId && a.status !== 'Cancelled'
    );

    const doctorConflict = activeAppointments.find(
      (a) =>
        a.doctorId === doctor.id &&
        a.appointmentDate === date &&
        slotsOverlap(a.timeSlot, slot)
    );

    if (doctorConflict) {
      throw new AppError(
        `That time is no longer available: ${doctor.fullName} already has an appointment on ${date} at ${doctorConflict.timeSlot}. Please choose another slot.`,
        409,
        'SLOT_UNAVAILABLE'
      );
    }

    if (options.patientId) {
      const patientConflict = activeAppointments.find(
        (a) =>
          a.patientId === options.patientId &&
          a.appointmentDate === date &&
          slotsOverlap(a.timeSlot, slot)
      );

      if (patientConflict) {
        throw new AppError(
          `This patient already has an appointment on ${date} at ${patientConflict.timeSlot} with ${patientConflict.doctorName}. A patient cannot be double-booked; reschedule or cancel the existing appointment first.`,
          409,
          'PATIENT_SLOT_UNAVAILABLE'
        );
      }
    }
  }

  private static nextAppointmentCode(): string {
    let highest = 9000;
    for (const appointment of db.appointments) {
      const match = /^APT-(\d+)$/i.exec(appointment.appointmentCode || '');
      if (match) highest = Math.max(highest, Number(match[1]));
    }
    return `APT-${highest + 1}`;
  }

  private static applySlotKeys(
    appointment: IAppointment,
    schedule: { patientId: string; doctorId: string; date: string; slot: string },
    status: AppointmentStatus
  ): void {
    if (status === 'Cancelled') {
      delete appointment.doctorSlotKey;
      delete appointment.patientSlotKey;
      return;
    }
    const keys = slotKeys(schedule.patientId, schedule.doctorId, schedule.date, schedule.slot);
    appointment.doctorSlotKey = keys.doctorSlotKey;
    appointment.patientSlotKey = keys.patientSlotKey;
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
      ? STANDARD_TIME_SLOTS.filter((slot) => !booked.some((taken) => slotsOverlap(taken, slot)))
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
      status?: AppointmentStatus;
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
    this.assertSlotIsBookable(doctor, data.appointmentDate, data.timeSlot, {
      patientId: patient.id,
    });

    const lockKey = slotLockKey(doctor.id, data.appointmentDate, data.timeSlot);

    return this.withSlotLock(lockKey, async () => {
      // Authoritative re-check performed while holding the slot lock.
      this.assertSlotIsBookable(doctor, data.appointmentDate, data.timeSlot, {
        patientId: patient.id,
      });

      const now = new Date().toISOString();
      const appointmentId = `apt-${uuidv4().substring(0, 8)}`;

      const newAppointment: IAppointment = {
        id: appointmentId,
        appointmentCode: this.nextAppointmentCode(),
        patientId: patient.id,
        patientName: patient.fullName,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        appointmentDate: data.appointmentDate,
        timeSlot: data.timeSlot,
        startTime: data.timeSlot.split('-')[0]?.trim(),
        endTime: data.timeSlot.split('-')[1]?.trim(),
        reason: data.reason,
        status: data.status ?? 'Confirmed',
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      };

      this.applySlotKeys(
        newAppointment,
        {
          patientId: patient.id,
          doctorId: doctor.id,
          date: data.appointmentDate,
          slot: data.timeSlot,
        },
        newAppointment.status
      );

      // Synchronous mutation immediately after the re-check: no await between
      // verification and insert, so no competing request can slip through.
      db.appointments.unshift(newAppointment);

      if (!doctor.assignedPatientIds.includes(patient.id)) {
        doctor.assignedPatientIds.push(patient.id);
      }
      if (!patient.assignedDoctorId) {
        patient.assignedDoctorId = doctor.id;
      }

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

  /**
   * Reschedule / edit an appointment. This is the explicit alternative to
   * overwriting a record: the old slot is released and the new slot is
   * validated for both the doctor and the patient before anything changes.
   */
  public static async updateAppointment(
    appointmentId: string,
    updates: {
      patientId?: string;
      doctorId?: string;
      appointmentDate?: string;
      timeSlot?: string;
      reason?: string;
      notes?: string;
      status?: AppointmentStatus;
    },
    actor: { id: string; name: string; role: any }
  ): Promise<IAppointment> {
    const appointment = db.appointments.find((a) => a.id === appointmentId);
    if (!appointment) {
      throw new AppError(
        `Appointment with ID '${appointmentId}' not found.`,
        404,
        'APPOINTMENT_NOT_FOUND'
      );
    }

    const patientId = updates.patientId ?? appointment.patientId;
    const doctorId = updates.doctorId ?? appointment.doctorId;
    const date = updates.appointmentDate ?? appointment.appointmentDate;
    const slot = updates.timeSlot ?? appointment.timeSlot;
    const status = updates.status ?? appointment.status;

    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    const doctor = db.doctors.find((d) => d.id === doctorId && d.isActive);
    if (!doctor) {
      throw new AppError(
        `Doctor with ID '${doctorId}' not found or inactive.`,
        404,
        'DOCTOR_NOT_FOUND'
      );
    }

    const scheduleChanged =
      patientId !== appointment.patientId ||
      doctorId !== appointment.doctorId ||
      date !== appointment.appointmentDate ||
      slot !== appointment.timeSlot;

    if (scheduleChanged || status !== 'Cancelled') {
      this.assertSlotIsBookable(doctor, date, slot, {
        patientId,
        excludeAppointmentId: appointment.id,
        // Keep past records editable for notes/reason without pretending a
        // past slot can be rebooked.
        allowPast: !scheduleChanged,
      });
    }

    const lockKeys = [
      slotLockKey(appointment.doctorId, appointment.appointmentDate, appointment.timeSlot),
      slotLockKey(doctor.id, date, slot),
    ];

    return this.withSlotLocks(lockKeys, async () => {
      // Re-read in case another request changed it while waiting for the lock.
      const current = db.appointments.find((a) => a.id === appointmentId);
      if (!current) {
        throw new AppError(
          `Appointment with ID '${appointmentId}' not found.`,
          404,
          'APPOINTMENT_NOT_FOUND'
        );
      }

      if (scheduleChanged || status !== 'Cancelled') {
        this.assertSlotIsBookable(doctor, date, slot, {
          patientId,
          excludeAppointmentId: current.id,
          allowPast: !scheduleChanged,
        });
      }

      const previous = {
        doctorId: current.doctorId,
        doctorName: current.doctorName,
        appointmentDate: current.appointmentDate,
        timeSlot: current.timeSlot,
        status: current.status,
      };

      current.patientId = patient.id;
      current.patientName = patient.fullName;
      current.doctorId = doctor.id;
      current.doctorName = doctor.fullName;
      current.appointmentDate = date;
      current.timeSlot = slot;
      current.startTime = slot.split('-')[0]?.trim();
      current.endTime = slot.split('-')[1]?.trim();
      current.status = status;
      if (updates.reason !== undefined) current.reason = updates.reason;
      if (updates.notes !== undefined) current.notes = updates.notes;
      current.updatedAt = new Date().toISOString();

      this.applySlotKeys(
        current,
        { patientId, doctorId: doctor.id, date, slot },
        status
      );

      logAuditEvent(actor, 'APPOINTMENT_UPDATED', 'Appointment', current.id, 'SUCCESS', undefined, {
        previous,
        next: {
          doctorId: current.doctorId,
          appointmentDate: current.appointmentDate,
          timeSlot: current.timeSlot,
          status: current.status,
        },
      });

      if (scheduleChanged) {
        NotificationService.send({
          recipientId: doctor.userId,
          recipientRole: 'doctor',
          title: 'Appointment Rescheduled',
          message: `${patient.fullName} was moved to ${date} at ${slot}.`,
          type: 'INFO',
        });
      }

      return current;
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
    // double-book the doctor or the patient: the slot may have been taken.
    if (apt.status === 'Cancelled' && status !== 'Cancelled') {
      const doctor = db.doctors.find((d) => d.id === apt.doctorId);
      if (!doctor) {
        throw new AppError(
          `Cannot restore this appointment: doctor '${apt.doctorId}' no longer exists.`,
          409,
          'DOCTOR_NOT_FOUND'
        );
      }
      this.assertSlotIsBookable(doctor, apt.appointmentDate, apt.timeSlot, {
        patientId: apt.patientId,
        excludeAppointmentId: apt.id,
        allowPast: true,
      });
    }

    const previousStatus = apt.status;
    apt.status = status;
    if (notes !== undefined) apt.notes = notes;
    apt.updatedAt = new Date().toISOString();

    this.applySlotKeys(
      apt,
      {
        patientId: apt.patientId,
        doctorId: apt.doctorId,
        date: apt.appointmentDate,
        slot: apt.timeSlot,
      },
      status
    );

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
