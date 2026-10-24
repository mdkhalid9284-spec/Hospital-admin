import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IAdmission } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { BedService } from './bed.service.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { NotificationService } from './notification.service.js';

export class AdmissionService {
  /**
   * Complete Patient Admission Workflow (Cyclomatic Complexity V(G) = 4)
   * Paths:
   * P1: All checks pass -> Allocate Bed -> Assign Doctor -> Create Admission -> Update Patient
   * P2: Patient not found / invalid
   * P3: Bed unavailable / occupied / not found
   * P4: Doctor unavailable / inactive / not found
   */
  public static async admitPatient(
    data: {
      patientId: string;
      doctorId: string;
      wardId: string;
      roomNumber: string;
      bedNumber: string;
      reason: string;
    },
    actor: { id: string; name: string; role: any }
  ): Promise<IAdmission> {
    // 1. Decision Point 1 (C1): Check Patient Existence & Validity
    const patient = db.patients.find((p) => p.id === data.patientId);
    if (!patient) {
      throw new AppError(`Cannot admit: Patient with ID '${data.patientId}' does not exist.`, 404, 'PATIENT_NOT_FOUND');
    }

    if (patient.currentAdmissionId) {
      throw new AppError(
        `Cannot admit: Patient '${patient.fullName}' is already actively admitted under admission ID '${patient.currentAdmissionId}'.`,
        409,
        'PATIENT_ALREADY_ADMITTED'
      );
    }

    // 2. Decision Point 2 (C3): Check Bed Existence and Real-Time Availability
    const { ward, bed } = await BedService.findBed(data.wardId, data.roomNumber, data.bedNumber);
    if (bed.status !== 'Available') {
      throw new AppError(
        `Cannot admit: Bed '${data.bedNumber}' in ward '${ward.name}' is currently ${bed.status}.`,
        409,
        'BED_NOT_AVAILABLE'
      );
    }

    // 3. Decision Point 3 (C4): Check Doctor Existence and Availability
    const doctor = db.doctors.find((d) => d.id === data.doctorId && d.isActive);
    if (!doctor) {
      throw new AppError(
        `Cannot admit: Doctor with ID '${data.doctorId}' is not found or is currently inactive.`,
        409,
        'DOCTOR_UNAVAILABLE'
      );
    }

    // --- All Validations Passed (Path P1): Execute Atomic Binding ---
    const admissionId = `adm-${uuidv4().substring(0, 8)}`;
    const admissionCode = `ADM-${8000 + db.admissions.length + 1}`;

    // Allocate Bed atomically
    await BedService.allocateBed(
      data.wardId,
      data.roomNumber,
      data.bedNumber,
      patient.id,
      patient.fullName,
      admissionId,
      actor
    );

    // Ensure doctor assignment link
    if (!doctor.assignedPatientIds.includes(patient.id)) {
      doctor.assignedPatientIds.push(patient.id);
    }
    patient.assignedDoctorId = doctor.id;
    patient.currentAdmissionId = admissionId;
    patient.updatedAt = new Date().toISOString();

    const newAdmission: IAdmission = {
      id: admissionId,
      admissionCode,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      wardId: ward.id,
      wardName: ward.name,
      roomNumber: data.roomNumber,
      bedNumber: data.bedNumber,
      reason: data.reason,
      admissionDate: new Date().toISOString(),
      dischargeDate: null,
      status: 'Admitted',
      dischargeSummary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.admissions.unshift(newAdmission);

    logAuditEvent(actor, 'PATIENT_ADMISSION_COMPLETED', 'Admission', newAdmission.id, 'SUCCESS', undefined, {
      admissionCode: newAdmission.admissionCode,
      patientId: patient.id,
      bedNumber: data.bedNumber,
      doctorId: doctor.id,
    });

    // Send notifications to Patient and Doctor
    NotificationService.send({
      recipientId: patient.userId,
      recipientRole: 'patient',
      title: 'Hospital Admission Active',
      message: `You have been admitted to ${ward.name} (${data.roomNumber}, Bed ${data.bedNumber}) under ${doctor.fullName}.`,
      type: 'INFO',
    });

    NotificationService.send({
      recipientId: doctor.userId,
      recipientRole: 'doctor',
      title: 'New Admitted Patient Assigned',
      message: `Patient ${patient.fullName} admitted to Bed ${data.bedNumber} has been assigned to you.`,
      type: 'ALERT',
    });

    return newAdmission;
  }

  public static async getAllAdmissions(): Promise<IAdmission[]> {
    return db.admissions;
  }

  public static async getById(id: string): Promise<IAdmission> {
    const adm = db.admissions.find((a) => a.id === id);
    if (!adm) {
      throw new AppError(`Admission with ID '${id}' not found.`, 404, 'ADMISSION_NOT_FOUND');
    }
    return adm;
  }

  public static async getByPatientId(patientId: string): Promise<IAdmission[]> {
    return db.admissions.filter((a) => a.patientId === patientId);
  }
}
