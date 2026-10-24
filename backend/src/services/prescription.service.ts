import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IPrescription, IPrescriptionMedicine } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { NotificationService } from './notification.service.js';
import { calculateAge } from '../utils/date.js';

export class PrescriptionService {
  public static async createPrescription(
    data: {
      patientId: string;
      doctorId: string;
      diagnosis: string;
      medicines: IPrescriptionMedicine[];
      generalAdvice?: string;
    },
    actor: { id: string; name: string; role: any }
  ): Promise<IPrescription> {
    const patient = db.patients.find((p) => p.id === data.patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${data.patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    const doctor = db.doctors.find((d) => d.id === data.doctorId && d.isActive);
    if (!doctor) {
      throw new AppError(`Doctor with ID '${data.doctorId}' not found or inactive.`, 404, 'DOCTOR_NOT_FOUND');
    }

    // Doctors may only prescribe for patients they are authorized to treat.
    const isAssigned =
      patient.assignedDoctorId === doctor.id || doctor.assignedPatientIds.includes(patient.id);
    if (!isAssigned) {
      throw new AppError(
        'Forbidden. You can only issue prescriptions for patients assigned to your care.',
        403,
        'NOT_ASSIGNED_PATIENT'
      );
    }

    const prescriptionId = `rx-${uuidv4().substring(0, 8)}`;
    const prescriptionCode = `RX-${5000 + db.prescriptions.length + 1}`;
    const prescribedAt = new Date().toISOString();

    const newPrescription: IPrescription = {
      id: prescriptionId,
      prescriptionCode,
      patientId: patient.id,
      patientName: patient.fullName,
      patientCode: patient.patientCode,
      patientDob: patient.dob,
      patientAge: calculateAge(patient.dob, prescribedAt),
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      diagnosis: data.diagnosis,
      medicines: data.medicines,
      generalAdvice: data.generalAdvice,
      prescribedAt,
    };

    db.prescriptions.unshift(newPrescription);

    logAuditEvent(actor, 'PRESCRIPTION_CREATED', 'Prescription', newPrescription.id, 'SUCCESS', undefined, {
      prescriptionCode: newPrescription.prescriptionCode,
      patientId: patient.id,
      medicinesCount: data.medicines.length,
    });

    NotificationService.send({
      recipientId: patient.userId,
      recipientRole: 'patient',
      title: 'New Prescription Issued',
      message: `Dr. ${doctor.fullName} has issued a new prescription (${newPrescription.prescriptionCode}).`,
      type: 'INFO',
    });

    return newPrescription;
  }

  public static async getByPatientId(patientId: string): Promise<IPrescription[]> {
    return db.prescriptions.filter((p) => p.patientId === patientId);
  }

  public static async getAll(): Promise<IPrescription[]> {
    return db.prescriptions;
  }
}
