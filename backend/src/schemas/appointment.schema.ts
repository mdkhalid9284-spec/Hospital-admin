import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  timeSlot: z.string().min(3, 'Time slot is required (e.g. 10:00 - 10:30)'),
  reason: z.string().min(3, 'Reason for consultation is required'),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = z
  .object({
    patientId: z.string().min(1, 'Patient ID cannot be empty').optional(),
    doctorId: z.string().min(1, 'Doctor ID cannot be empty').optional(),
    appointmentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional(),
    timeSlot: z.string().min(3, 'Time slot is required (e.g. 10:00 - 10:30)').optional(),
    reason: z.string().min(3, 'Reason for consultation is required').optional(),
    notes: z.string().optional(),
    status: z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled']),
  notes: z.string().optional(),
});
