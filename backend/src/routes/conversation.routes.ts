import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { validateRequest } from '../middlewares/validator.js';
import { ConversationController } from '../controllers/conversation.controller.js';
import { createConversationSchema, sendMessageSchema } from '../schemas/communication.schema.js';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  requireRoles('admin', 'doctor', 'patient', 'billing'),
  ConversationController.list
);

router.post(
  '/',
  requireRoles('admin', 'doctor', 'patient'),
  validateRequest({ body: createConversationSchema }),
  ConversationController.create
);

router.get(
  '/:id/messages',
  requireRoles('admin', 'doctor', 'patient', 'billing'),
  ConversationController.getMessages
);

router.post(
  '/:id/messages',
  requireRoles('admin', 'doctor', 'patient'),
  validateRequest({ body: sendMessageSchema }),
  ConversationController.sendMessage
);

router.post(
  '/:id/read',
  requireRoles('admin', 'doctor', 'patient', 'billing'),
  ConversationController.markRead
);

export default router;
