import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validator.js';
import { TeleconsultationController } from '../controllers/teleconsultation.controller.js';
import { startTeleconsultationSchema } from '../schemas/communication.schema.js';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  requireRoles('admin', 'doctor', 'patient'),
  TeleconsultationController.list
);

router.post(
  '/',
  requireRoles('admin', 'doctor', 'patient'),
  validateRequest({ body: startTeleconsultationSchema }),
  TeleconsultationController.start
);

router.get(
  '/:id',
  requireRoles('admin', 'doctor', 'patient'),
  TeleconsultationController.getById
);

router.post(
  '/:id/end',
  requireRoles('admin', 'doctor', 'patient'),
  TeleconsultationController.end
);

export default router;
