import { z } from 'zod';

export const createPatientSchema = z.object({
  fullName: z.string().min(2, 'Full name is required (min 2 characters)'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format'),
  gender: z.enum(['male', 'female', 'other']),
  bloodGroup: z.string().optional(),
  phone: z.string().min(7, 'Valid phone number is required'),
  email: z.string().email('Valid email address is required'),
  address: z.string().min(5, 'Address is required (min 5 characters)'),
  emergencyContact: z.object({
    name: z.string().min(2, 'Emergency contact name is required'),
    relationship: z.string().min(2, 'Relationship is required'),
    phone: z.string().min(7, 'Emergency contact phone is required'),
  }),
  assignedDoctorId: z.string().optional(),
  /**
   * Explicit administrator confirmation that the new record is genuinely a
   * different person despite the similarity warning.
   */
  confirmDistinct: z.boolean().optional(),
});

export const checkPatientDuplicatesSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format'),
  gender: z.enum(['male', 'female', 'other']),
  phone: z.string().min(7, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
});

export const updatePatientSchema = createPatientSchema.partial();
