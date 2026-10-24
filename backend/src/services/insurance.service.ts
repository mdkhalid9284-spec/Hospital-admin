import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IInsuranceClaim, ClaimStatus } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { NotificationService } from './notification.service.js';

export class InsuranceService {
  public static async submitClaim(
    data: {
      patientId: string;
      billId: string;
      provider: string;
      policyNumber: string;
      claimAmount: number;
      remarks?: string;
    },
    actor: { id: string; name: string; role: any }
  ): Promise<IInsuranceClaim> {
    const patient = db.patients.find((p) => p.id === data.patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${data.patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    const bill = db.bills.find((b) => b.id === data.billId);
    if (!bill) {
      throw new AppError(`Bill with ID '${data.billId}' not found.`, 404, 'BILL_NOT_FOUND');
    }

    const claimId = `clm-${uuidv4().substring(0, 8)}`;
    const claimCode = `CLM-${7000 + db.insuranceClaims.length + 1}`;

    const newClaim: IInsuranceClaim = {
      id: claimId,
      claimCode,
      patientId: patient.id,
      patientName: patient.fullName,
      billId: bill.id,
      provider: data.provider,
      policyNumber: data.policyNumber,
      claimAmount: data.claimAmount,
      status: 'Submitted',
      remarks: data.remarks,
      submittedAt: new Date().toISOString(),
      adjudicatedAt: null,
    };

    db.insuranceClaims.unshift(newClaim);

    logAuditEvent(actor, 'INSURANCE_CLAIM_SUBMITTED', 'InsuranceClaim', newClaim.id, 'SUCCESS', undefined, {
      claimCode: newClaim.claimCode,
      provider: newClaim.provider,
      claimAmount: newClaim.claimAmount,
    });

    return newClaim;
  }

  public static async updateClaimStatus(
    claimId: string,
    data: {
      status: ClaimStatus;
      approvedAmount?: number;
      remarks?: string;
    },
    actor: { id: string; name: string; role: any }
  ): Promise<IInsuranceClaim> {
    const claim = db.insuranceClaims.find((c) => c.id === claimId);
    if (!claim) {
      throw new AppError(`Claim with ID '${claimId}' not found.`, 404, 'CLAIM_NOT_FOUND');
    }

    claim.status = data.status;
    if (data.approvedAmount !== undefined) claim.approvedAmount = data.approvedAmount;
    if (data.remarks) claim.remarks = data.remarks;
    claim.adjudicatedAt = new Date().toISOString();

    logAuditEvent(actor, 'INSURANCE_CLAIM_STATUS_UPDATED', 'InsuranceClaim', claim.id, 'SUCCESS', undefined, {
      claimCode: claim.claimCode,
      status: claim.status,
      approvedAmount: claim.approvedAmount,
    });

    const patient = db.patients.find((p) => p.id === claim.patientId);
    if (patient) {
      NotificationService.send({
        recipientId: patient.userId,
        recipientRole: 'patient',
        title: `Insurance Claim ${claim.status}`,
        message: `Claim ${claim.claimCode} has been marked ${claim.status}. ${
          claim.approvedAmount ? `Approved Amount: $${claim.approvedAmount.toFixed(2)}.` : ''
        }`,
        type: claim.status === 'Approved' ? 'SUCCESS' : 'WARNING',
      });
    }

    return claim;
  }

  public static async getByPatientId(patientId: string): Promise<IInsuranceClaim[]> {
    return db.insuranceClaims.filter((c) => c.patientId === patientId);
  }

  public static async getAll(): Promise<IInsuranceClaim[]> {
    return db.insuranceClaims;
  }
}
