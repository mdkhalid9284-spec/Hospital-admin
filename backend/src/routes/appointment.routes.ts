import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validator.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
} from '../schemas/appointment.schema.js';

const router = Router();

router.use(authenticateToken);

router.get('/available-slots', AppointmentController.getAvailableSlots);
router.get('/', AppointmentController.getAll);

router.post(
  '/',
  requireRoles('admin', 'patient', 'doctor'),
  validateRequest({ body: createAppointmentSchema }),
  AppointmentController.book
);

/**
 * Reschedule / edit. Registering before /:id/status keeps the static suffix
 * route working; Express matches in declaration order.
 */
router.patch(
  '/:id',
  requireRoles('admin', 'doctor', 'patient'),
  validateRequest({ body: updateAppointmentSchema }),
  AppointmentController.update
);

router.patch(
  '/:id/status',
  requireRoles('admin', 'doctor', 'patient'),
  validateRequest({ body: updateAppointmentStatusSchema }),
  AppointmentController.updateStatus
);

export default router;
