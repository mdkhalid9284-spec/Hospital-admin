import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IMedicalRecord } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';

export class MedicalRecordService {
  public static async createNote(
    data: {
      patientId: string;
      doctorId: string;
      title: string;
      notes: string;
      recordType?: 'ClinicalNote' | 'Consultation' | 'Diagnosis' | 'LabReport';
      vitalSigns?: {
        bloodPressure?: string;
        heartRate?: number;
        temperature?: number;
        spo2?: number;
      };
    },
    actor: { id: string; name: string; role: any }
  ): Promise<IMedicalRecord> {
    const patient = db.patients.find((p) => p.id === data.patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${data.patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    const doctor = db.doctors.find((d) => d.id === data.doctorId);
    if (!doctor) {
      throw new AppError(`Doctor with ID '${data.doctorId}' not found.`, 404, 'DOCTOR_NOT_FOUND');
    }

    const recordId = `rec-${uuidv4().substring(0, 8)}`;

    const newRecord: IMedicalRecord = {
      id: recordId,
      patientId: patient.id,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      recordType: data.recordType || 'ClinicalNote',
      title: data.title,
      notes: data.notes,
      vitalSigns: data.vitalSigns,
      createdAt: new Date().toISOString(),
    };

    db.medicalRecords.unshift(newRecord);

    logAuditEvent(actor, 'CLINICAL_NOTE_CREATED', 'MedicalRecord', newRecord.id, 'SUCCESS', undefined, {
      patientId: patient.id,
      recordType: newRecord.recordType,
      title: newRecord.title,
    });

    return newRecord;
  }

  public static async getById(recordId: string): Promise<IMedicalRecord> {
    const rec = db.medicalRecords.find((r) => r.id === recordId);
    if (!rec) {
      throw new AppError(`Medical record with ID '${recordId}' not found.`, 404, 'RECORD_NOT_FOUND');
    }
    return rec;
  }

  public static async updateNote(
    recordId: string,
    updates: Partial<IMedicalRecord>,
    actor: { id: string; name: string; role: any }
  ): Promise<IMedicalRecord> {
    const record = await this.getById(recordId);
    Object.assign(record, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    logAuditEvent(actor, 'CLINICAL_NOTE_UPDATED', 'MedicalRecord', record.id, 'SUCCESS', undefined, updates);
    return record;
  }

  public static async getByPatientId(patientId: string): Promise<IMedicalRecord[]> {
    return db.medicalRecords.filter((r) => r.patientId === patientId);
  }
}
