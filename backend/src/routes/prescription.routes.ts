import { Router } from 'express';
import { PrescriptionController } from '../controllers/prescription.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles, requireResourceOwnership } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validator.js';
import { createPrescriptionSchema } from '../schemas/clinical.schema.js';

const router = Router();

router.use(authenticateToken);

// Create digital prescription (Doctor only)
router.post(
  '/',
  requireRoles('doctor'),
  validateRequest({ body: createPrescriptionSchema }),
  PrescriptionController.create
);

// Get all prescriptions (Doctor / Admin)
router.get('/', requireRoles('admin', 'doctor'), PrescriptionController.getAll);

// Get prescriptions for specific patient
router.get(
  '/patient/:patientId',
  requireRoles('admin', 'doctor', 'patient'),
  requireResourceOwnership((req) => req.params.patientId as string, 'patient'),
  PrescriptionController.getByPatientId
);

export default router;
