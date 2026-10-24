import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles, requireResourceOwnership } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validator.js';
import { createBillSchema, recordPaymentSchema } from '../schemas/billing.schema.js';

const router = Router();

router.use(authenticateToken);

// List all bills (Billing, Admin, Patient)
router.get('/', requireRoles('admin', 'billing', 'patient'), BillingController.getAll);

// Create bill (Billing Staff, Admin)
router.post(
  '/',
  requireRoles('admin', 'billing'),
  validateRequest({ body: createBillSchema }),
  BillingController.create
);

// Record payment
router.post(
  '/:id/payments',
  requireRoles('admin', 'billing'),
  validateRequest({ body: recordPaymentSchema }),
  BillingController.recordPayment
);

// Get bills for specific patient
router.get(
  '/patient/:patientId',
  requireRoles('admin', 'billing', 'patient'),
  requireResourceOwnership((req) => req.params.patientId, 'patient'),
  BillingController.getByPatientId
);

export default router;
