import { db } from '../database/index.js';
import { IDoctor } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';

export class DoctorService {
  public static async getAll(includeInactive = false): Promise<IDoctor[]> {
    return includeInactive ? db.doctors : db.doctors.filter((d) => d.isActive);
  }

  public static async getById(doctorId: string): Promise<IDoctor> {
    const doc = db.doctors.find((d) => d.id === doctorId);
    if (!doc) {
      throw new AppError(`Doctor with ID '${doctorId}' not found.`, 404, 'DOCTOR_NOT_FOUND');
    }
    return doc;
  }

  public static async createDoctor(
    data: Omit<IDoctor, 'id' | 'doctorCode' | 'assignedPatientIds'>,
    actor: { id: string; name: string; role: any }
  ): Promise<IDoctor> {
    const doctorCode = `DOC-${200 + db.doctors.length + 1}`;
    const id = `doc-${Date.now().toString().slice(-4)}`;
    const newDoc: IDoctor = {
      id,
      userId: data.userId || `usr-${id}`,
      doctorCode,
      fullName: data.fullName,
      specialization: data.specialization,
      department: data.department,
      qualification: data.qualification,
      phone: data.phone,
      email: data.email,
      consultationFee: data.consultationFee,
      availableDays: data.availableDays,
      slotDurationMinutes: data.slotDurationMinutes || 30,
      isActive: true,
      assignedPatientIds: [],
    };
    db.doctors.push(newDoc);
    logAuditEvent(actor, 'DOCTOR_CREATED', 'Doctor', newDoc.id, 'SUCCESS', undefined, {
      doctorCode: newDoc.doctorCode,
      name: newDoc.fullName,
    });
    return newDoc;
  }

  public static async updateDoctor(
    doctorId: string,
    updates: Partial<IDoctor>,
    actor: { id: string; name: string; role: any }
  ): Promise<IDoctor> {
    const doc = await this.getById(doctorId);
    Object.assign(doc, updates);
    logAuditEvent(actor, 'DOCTOR_UPDATED', 'Doctor', doc.id, 'SUCCESS', undefined, updates);
    return doc;
  }

  public static async toggleStatus(
    doctorId: string,
    actor: { id: string; name: string; role: any }
  ): Promise<IDoctor> {
    const doc = await this.getById(doctorId);
    doc.isActive = !doc.isActive;
    logAuditEvent(actor, 'DOCTOR_STATUS_TOGGLED', 'Doctor', doc.id, 'SUCCESS', undefined, {
      isActive: doc.isActive,
    });
    return doc;
  }

  public static async assignPatientToDoctor(
    doctorId: string,
    patientId: string,
    actor: { id: string; name: string; role: any }
  ): Promise<void> {
    const doctor = await this.getById(doctorId);
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    if (!doctor.assignedPatientIds.includes(patientId)) {
      doctor.assignedPatientIds.push(patientId);
    }
    patient.assignedDoctorId = doctor.id;
    patient.updatedAt = new Date().toISOString();

    logAuditEvent(actor, 'DOCTOR_ASSIGNED_PATIENT', 'Doctor', doctor.id, 'SUCCESS', undefined, {
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      patientId: patient.id,
      patientName: patient.fullName,
    });
  }
}
