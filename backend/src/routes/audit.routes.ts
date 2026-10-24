import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/', requireRoles('admin'), AuditController.getLogs);

export default router;
