import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  category: z.enum(['Prescription', 'Report', 'Scan', 'Bill', 'Insurance', 'Other']),
  title: z.string().min(2, 'Document title is required'),
  isExternalRecord: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().default(false)
  ),
});
