import { z } from 'zod';

export const createBillSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  admissionId: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        description: z.string().min(2, 'Item description is required'),
        category: z.string().min(2, 'Category is required'),
        quantity: z.number().int().positive('Quantity must be at least 1'),
        unitPrice: z.number().positive('Unit price must be positive'),
      })
    )
    .min(1, 'At least one line item is required'),
  discount: z.number().min(0).default(0),
  taxRatePercent: z.number().min(0).max(100).default(5),
});

export const recordPaymentSchema = z.object({
  amountPaid: z.number().positive('Payment amount must be greater than 0'),
});

export const createInsuranceClaimSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  billId: z.string().min(1, 'Bill ID is required'),
  provider: z.string().min(2, 'Insurance provider is required'),
  policyNumber: z.string().min(3, 'Policy number is required'),
  claimAmount: z.number().positive('Claim amount must be greater than 0'),
  remarks: z.string().optional(),
});

export const updateInsuranceClaimStatusSchema = z.object({
  status: z.enum(['Submitted', 'Approved', 'Rejected']),
  approvedAmount: z.number().min(0).optional(),
  remarks: z.string().optional(),
});
