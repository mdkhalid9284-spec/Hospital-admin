import { Router } from 'express';
import { AdmissionController } from '../controllers/admission.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validator.js';
import { createAdmissionSchema, dischargePatientSchema } from '../schemas/admission.schema.js';

const router = Router();

router.use(authenticateToken);

// List admissions
router.get('/', requireRoles('admin', 'doctor', 'patient', 'billing'), AdmissionController.getAll);

// Get admission by ID
router.get('/:id', requireRoles('admin', 'doctor', 'patient', 'billing'), AdmissionController.getById);

// Start hospital admission (Admin only)
router.post(
  '/',
  requireRoles('admin'),
  validateRequest({ body: createAdmissionSchema }),
  AdmissionController.admit
);

// Process discharge (Admin only)
router.post(
  '/:id/discharge',
  requireRoles('admin'),
  validateRequest({ body: dischargePatientSchema }),
  AdmissionController.discharge
);

export default router;
