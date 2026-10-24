import { Router } from 'express';
import { RecordController } from '../controllers/record.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles, requireResourceOwnership } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validator.js';
import { createClinicalNoteSchema } from '../schemas/clinical.schema.js';

const router = Router();

router.use(authenticateToken);

// Add clinical note (Doctor only)
router.post(
  '/clinical-note',
  requireRoles('doctor'),
  validateRequest({ body: createClinicalNoteSchema }),
  RecordController.createClinicalNote
);

// Update clinical note (Doctor only — admins must not directly alter clinical notes)
router.patch(
  '/:id',
  requireRoles('doctor'),
  RecordController.updateClinicalNote
);

// Get medical records for patient
router.get(
  '/patient/:patientId',
  requireRoles('admin', 'doctor', 'patient'),
  requireResourceOwnership((req) => req.params.patientId as string, 'patient'),
  RecordController.getByPatientId
);

export default router;
