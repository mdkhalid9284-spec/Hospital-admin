import { Router } from 'express';
import { InsuranceController } from '../controllers/insurance.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles, requireResourceOwnership } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validator.js';
import {
  createInsuranceClaimSchema,
  updateInsuranceClaimStatusSchema,
} from '../schemas/billing.schema.js';

const router = Router();

router.use(authenticateToken);

// List insurance claims
router.get('/', requireRoles('admin', 'billing', 'patient'), InsuranceController.getAll);

// Submit insurance claim
router.post(
  '/claims',
  requireRoles('admin', 'billing', 'patient'),
  validateRequest({ body: createInsuranceClaimSchema }),
  InsuranceController.submitClaim
);

// Update insurance claim status (Billing, Admin)
router.patch(
  '/claims/:id/status',
  requireRoles('admin', 'billing'),
  validateRequest({ body: updateInsuranceClaimStatusSchema }),
  InsuranceController.updateClaimStatus
);

// Get claims for specific patient
router.get(
  '/patient/:patientId',
  requireRoles('admin', 'billing', 'patient'),
  requireResourceOwnership((req) => req.params.patientId as string, 'patient'),
  InsuranceController.getByPatientId
);

export default router;
