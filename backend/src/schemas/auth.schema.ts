import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  // Public self-registration is strictly patient-scoped. Admin/doctor/billing
  // accounts are provisioned server-side by an administrator; the client can
  // never assert an arbitrary role.
  role: z.enum(['patient']).default('patient'),
  phone: z.string().min(7, 'Invalid phone number format').optional(),
});

/**
 * Patient portal sign-up: an existing hospital record is claimed, never
 * recreated. The identifier may be a Patient ID, registered email or phone.
 */
export const patientSignupSchema = z.object({
  identifier: z.string().min(3, 'Enter your Patient ID, registered email or phone number'),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must use the YYYY-MM-DD format'),
  phone: z.string().min(7, 'Enter the phone number registered with the hospital'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const existingPatientPrepareSchema = z.object({
  identifier: z.string().min(3, 'Enter your Patient ID, registered email or phone number'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must use the YYYY-MM-DD format'),
  phone: z.string().min(7, 'Enter the phone number registered with the hospital'),
  email: z.string().email('Invalid email address'),
});

export const existingPatientCompleteSchema = z.object({
  claimToken: z.string().min(20, 'The hospital-record verification has expired. Start again.'),
});

export const newPatientRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must use the YYYY-MM-DD format'),
  gender: z.enum(['male', 'female', 'other']),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  emergencyContact: z.object({
    name: z.string().min(2, 'Emergency contact name is required'),
    relationship: z.string().min(2, 'Relationship is required'),
    phone: z.string().min(7, 'Emergency contact phone is required'),
  }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid or expired token'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});
