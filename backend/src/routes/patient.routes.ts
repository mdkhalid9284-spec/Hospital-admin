import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles, requireResourceOwnership } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validator.js';
import { createPatientSchema, updatePatientSchema } from '../schemas/patient.schema.js';

const router = Router();

router.use(authenticateToken);

// List / Search patients (Admin, Doctor, Billing)
router.get('/', requireRoles('admin', 'doctor', 'billing'), PatientController.getAll);

// Get patient by ID (Admin, Doctor, or Self Patient)
router.get(
  '/:id',
  requireRoles('admin', 'doctor', 'patient', 'billing'),
  requireResourceOwnership((req) => req.params.id as string, 'patient'),
  PatientController.getById
);

// Register patient (Admin or public self-registration handled in auth)
router.post(
  '/',
  requireRoles('admin'),
  validateRequest({ body: createPatientSchema }),
  PatientController.create
);

// Update patient profile
router.patch(
  '/:id',
  requireRoles('admin', 'patient'),
  requireResourceOwnership((req) => req.params.id as string, 'patient'),
  validateRequest({ body: updatePatientSchema }),
  PatientController.update
);

export default router;
