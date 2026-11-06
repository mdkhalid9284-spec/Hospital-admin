import { z } from 'zod';

export const createConversationSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required').optional(),
  doctorId: z.string().min(1, 'Doctor ID cannot be empty').optional(),
  subject: z.string().max(120, 'Subject must be 120 characters or fewer').optional(),
});

export const sendMessageSchema = z.object({
  body: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(4000, 'Message must be 4000 characters or fewer'),
});

export const startTeleconsultationSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required').optional(),
  doctorId: z.string().min(1, 'Doctor ID cannot be empty').optional(),
  appointmentId: z.string().min(1, 'Appointment ID cannot be empty').optional(),
});
