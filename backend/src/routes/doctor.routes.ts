import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', DoctorController.getAll);
router.get('/:id', DoctorController.getById);
router.post('/', requireRoles('admin'), DoctorController.create);
router.patch('/:id', requireRoles('admin'), DoctorController.update);
router.patch('/:id/toggle-status', requireRoles('admin'), DoctorController.toggleStatus);
router.post('/assign-patient', requireRoles('admin'), DoctorController.assignPatient);

export default router;
