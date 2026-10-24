import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/document.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRoles, requireResourceOwnership } from '../middlewares/rbac.middleware.js';
import { config } from '../config/index.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxFileSizeMb * 1024 * 1024,
  },
});

router.use(authenticateToken);

// List all documents or role-filtered
router.get('/', requireRoles('admin', 'doctor', 'patient', 'billing'), DocumentController.getAll);

// Upload document (Patient, Doctor, Admin)
router.post(
  '/upload',
  requireRoles('admin', 'doctor', 'patient'),
  upload.single('file'),
  DocumentController.upload
);

// Download / View secure document
router.get('/:id/download', DocumentController.download);

// Delete document (Admin or Uploader)
router.delete('/:id', DocumentController.delete);

// Get documents for specific patient
router.get(
  '/patient/:patientId',
  requireRoles('admin', 'doctor', 'patient', 'billing'),
  requireResourceOwnership((req) => req.params.patientId as string, 'patient'),
  DocumentController.getByPatientId
);

export default router;
