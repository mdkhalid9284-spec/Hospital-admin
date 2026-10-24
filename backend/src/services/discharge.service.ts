import { db } from '../database/index.js';
import { IAdmission, IDischargeSummary } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { BedService } from './bed.service.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { NotificationService } from './notification.service.js';

export class DischargeService {
  public static async processDischarge(
    admissionId: string,
    summaryData: {
      diagnosis: string;
      treatmentGiven: string;
      adviceOnDischarge: string;
      followUpDate?: string;
    },
    actor: { id: string; name: string; role: any }
  ): Promise<IAdmission> {
    const admission = db.admissions.find((a) => a.id === admissionId);
    if (!admission) {
      throw new AppError(`Admission record '${admissionId}' not found.`, 404, 'ADMISSION_NOT_FOUND');
    }

    if (admission.status !== 'Admitted') {
      throw new AppError(
        `Cannot discharge: Admission '${admission.admissionCode}' is already ${admission.status}.`,
        400,
        'ALREADY_DISCHARGED'
      );
    }

    const patient = db.patients.find((p) => p.id === admission.patientId);

    // 1. Release occupied bed atomically
    await BedService.releaseBed(admission.wardId, admission.roomNumber, admission.bedNumber, actor);

    // 2. Generate formal discharge summary
    const dischargeSummary: IDischargeSummary = {
      diagnosis: summaryData.diagnosis,
      treatmentGiven: summaryData.treatmentGiven,
      adviceOnDischarge: summaryData.adviceOnDischarge,
      followUpDate: summaryData.followUpDate,
      dischargedBy: actor.name,
      dischargedAt: new Date().toISOString(),
    };

    // 3. Update Admission lifecycle
    admission.status = 'Discharged';
    admission.dischargeDate = new Date().toISOString();
    admission.dischargeSummary = dischargeSummary;
    admission.updatedAt = new Date().toISOString();

    // 4. Update Patient active status
    if (patient) {
      patient.currentAdmissionId = undefined;
      patient.updatedAt = new Date().toISOString();

      NotificationService.send({
        recipientId: patient.userId,
        recipientRole: 'patient',
        title: 'Discharge Process Completed',
        message: `Your hospital discharge has been processed. Bed ${admission.bedNumber} has been released.`,
        type: 'SUCCESS',
      });
    }

    logAuditEvent(actor, 'PATIENT_DISCHARGED', 'Admission', admission.id, 'SUCCESS', undefined, {
      admissionCode: admission.admissionCode,
      patientId: admission.patientId,
      bedReleased: admission.bedNumber,
      diagnosis: summaryData.diagnosis,
    });

    return admission;
  }
}
