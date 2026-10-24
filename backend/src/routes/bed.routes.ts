import { Router } from 'express';
import { BedController } from '../controllers/bed.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/board', requireRoles('admin', 'doctor', 'billing'), BedController.getBedBoard);
router.patch('/status', requireRoles('admin'), BedController.updateStatus);

export default router;
