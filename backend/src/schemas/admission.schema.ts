import { z } from 'zod';

export const createAdmissionSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  wardId: z.string().min(1, 'Ward ID is required'),
  roomNumber: z.string().min(1, 'Room Number is required'),
  bedNumber: z.string().min(1, 'Bed Number is required'),
  reason: z.string().min(3, 'Admission reason is required (min 3 characters)'),
});

export const dischargePatientSchema = z.object({
  diagnosis: z.string().min(3, 'Final diagnosis is required'),
  treatmentGiven: z.string().min(3, 'Summary of treatment given is required'),
  adviceOnDischarge: z.string().min(3, 'Discharge advice / instructions required'),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Follow up date must be in YYYY-MM-DD format').optional(),
});
