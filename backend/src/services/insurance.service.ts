import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import {
  IInsuranceClaim,
  IInsurancePolicy,
  ClaimStatus,
} from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { NotificationService } from './notification.service.js';

const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface ClaimFilters {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
}

const matchesFilters = (claim: IInsuranceClaim, filters?: ClaimFilters): boolean => {
  if (!filters) return true;

  if (filters.status && filters.status !== 'ALL' && claim.status !== filters.status) {
    return false;
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    const haystack = [
      claim.claimCode,
      claim.patientName,
      claim.provider,
      claim.policyNumber,
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  if (filters.from || filters.to) {
    const submitted = claim.submittedAt.slice(0, 10);
    if (filters.from && submitted < filters.from) return false;
    if (filters.to && submitted > filters.to) return false;
  }

  return true;
};

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

    if (bill.patientId !== patient.id) {
      throw new AppError(
        `The selected bill (${bill.billCode}) belongs to a different patient. A claim can only be filed against the patient's own invoice.`,
        400,
        'BILL_PATIENT_MISMATCH'
      );
    }

    const amount = round2(Number(data.claimAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Claim amount must be greater than zero.', 400, 'INVALID_CLAIM_AMOUNT');
    }
    if (amount > round2(bill.total) + 0.001) {
      throw new AppError(
        `Claim amount ($${amount.toFixed(2)}) cannot exceed the invoice total ($${bill.total.toFixed(2)}).`,
        400,
        'CLAIM_EXCEEDS_BILL'
      );
    }

    // Prevent duplicate active claims for the same invoice. A rejected claim
    // may be corrected and re-submitted.
    const duplicate = db.insuranceClaims.find(
      (claim) =>
        claim.billId === bill.id &&
        (claim.status === 'Submitted' || claim.status === 'Approved')
    );
    if (duplicate) {
      throw new AppError(
        `An active insurance claim (${duplicate.claimCode}, ${duplicate.status}) already exists for invoice ${bill.billCode}.`,
        409,
        'DUPLICATE_CLAIM'
      );
    }

    // If the policy number is already registered, it must belong to the patient.
    const knownPolicy = db.insurancePolicies.find(
      (policy) => policy.policyNumber.toLowerCase() === data.policyNumber.trim().toLowerCase()
    );
    if (knownPolicy && knownPolicy.patientId !== patient.id) {
      throw new AppError(
        'The supplied policy number is registered to a different patient.',
        403,
        'POLICY_PATIENT_MISMATCH'
      );
    }

    const claimId = `clm-${uuidv4().substring(0, 8)}`;
    const claimCode = `CLM-${7000 + db.insuranceClaims.length + 1}`;

    const newClaim: IInsuranceClaim = {
      id: claimId,
      claimCode,
      patientId: patient.id,
      patientName: patient.fullName,
      billId: bill.id,
      provider: data.provider.trim(),
      policyNumber: data.policyNumber.trim(),
      claimAmount: amount,
      status: 'Submitted',
      remarks: data.remarks?.trim() || undefined,
      submittedAt: new Date().toISOString(),
      adjudicatedAt: null,
    };

    db.insuranceClaims.unshift(newClaim);

    logAuditEvent(actor, 'INSURANCE_CLAIM_SUBMITTED', 'InsuranceClaim', newClaim.id, 'SUCCESS', undefined, {
      claimCode: newClaim.claimCode,
      billId: bill.id,
      billCode: bill.billCode,
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

    // Lifecycle: only a Submitted claim can move to Approved or Rejected.
    if (claim.status !== 'Submitted') {
      throw new AppError(
        `Claim ${claim.claimCode} is already ${claim.status} and cannot be adjudicated again.`,
        409,
        'INVALID_STATUS_TRANSITION'
      );
    }
    if (data.status !== 'Approved' && data.status !== 'Rejected') {
      throw new AppError(
        'A submitted claim can only transition to Approved or Rejected.',
        409,
        'INVALID_STATUS_TRANSITION'
      );
    }

    let approvedAmount = 0;
    if (data.status === 'Approved') {
      if (data.approvedAmount === undefined || data.approvedAmount === null) {
        throw new AppError(
          'An approved amount is required when approving a claim.',
          400,
          'APPROVED_AMOUNT_REQUIRED'
        );
      }
      approvedAmount = round2(Number(data.approvedAmount));
      if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
        throw new AppError(
          'Approved amount must be greater than zero.',
          400,
          'INVALID_APPROVED_AMOUNT'
        );
      }
      if (approvedAmount > claim.claimAmount + 0.001) {
        throw new AppError(
          `Approved amount ($${approvedAmount.toFixed(2)}) cannot exceed the claimed amount ($${claim.claimAmount.toFixed(2)}).`,
          400,
          'INVALID_APPROVED_AMOUNT'
        );
      }
    } else if (!data.remarks?.trim()) {
      throw new AppError(
        'Adjudication notes are required when rejecting a claim.',
        400,
        'REJECTION_NOTES_REQUIRED'
      );
    }

    const previousStatus = claim.status;
    claim.status = data.status;
    claim.approvedAmount = data.status === 'Approved' ? approvedAmount : 0;
    if (data.remarks?.trim()) claim.remarks = data.remarks.trim();
    claim.adjudicatedAt = new Date().toISOString();
    claim.adjudicatedBy = actor.id;

    logAuditEvent(actor, 'INSURANCE_CLAIM_STATUS_UPDATED', 'InsuranceClaim', claim.id, 'SUCCESS', undefined, {
      claimCode: claim.claimCode,
      previousStatus,
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
          claim.status === 'Approved'
            ? `Approved Amount: $${(claim.approvedAmount ?? 0).toFixed(2)}.`
            : ''
        }`,
        type: claim.status === 'Approved' ? 'SUCCESS' : 'WARNING',
      });
    }

    return claim;
  }

  public static async getByPatientId(
    patientId: string,
    filters?: ClaimFilters
  ): Promise<IInsuranceClaim[]> {
    return db.insuranceClaims.filter(
      (claim) => claim.patientId === patientId && matchesFilters(claim, filters)
    );
  }

  public static async getAll(filters?: ClaimFilters): Promise<IInsuranceClaim[]> {
    return db.insuranceClaims.filter((claim) => matchesFilters(claim, filters));
  }

  public static async getPoliciesByPatientId(patientId: string): Promise<IInsurancePolicy[]> {
    return db.insurancePolicies.filter((policy) => policy.patientId === patientId);
  }

  public static async getAllPolicies(): Promise<IInsurancePolicy[]> {
    return db.insurancePolicies;
  }
}
