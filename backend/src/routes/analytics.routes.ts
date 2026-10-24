import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/summary', requireRoles('admin', 'billing'), AnalyticsController.getSummary);

export default router;
