import { z } from 'zod';

export const createPrescriptionSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  diagnosis: z.string().min(3, 'Clinical diagnosis is required'),
  medicines: z
    .array(
      z.object({
        medicineName: z.string().min(1, 'Medicine name is required'),
        dosage: z.string().min(1, 'Dosage is required (e.g. 500mg)'),
        frequency: z.string().min(1, 'Frequency is required (e.g. 1-0-1 after food)'),
        duration: z.string().min(1, 'Duration is required (e.g. 5 days)'),
        instructions: z.string().optional().default('As advised'),
      })
    )
    .min(1, 'At least one medicine must be prescribed'),
  generalAdvice: z.string().optional(),
});

export const createClinicalNoteSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  recordType: z.enum(['ClinicalNote', 'Consultation', 'Diagnosis', 'LabReport']).default('ClinicalNote'),
  title: z.string().min(3, 'Note title is required'),
  notes: z.string().min(5, 'Clinical notes/observations are required'),
  vitalSigns: z
    .object({
      bloodPressure: z.string().optional(),
      heartRate: z.number().positive().optional(),
      temperature: z.number().positive().optional(),
      spo2: z.number().min(0).max(100).optional(),
    })
    .optional(),
});
