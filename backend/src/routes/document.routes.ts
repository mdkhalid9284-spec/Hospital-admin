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

// List all documents or role-filtered (clinical roles only — billing has no need)
router.get('/', requireRoles('admin', 'doctor', 'patient'), DocumentController.getAll);

// Upload document (Patient, Doctor, Admin). Doctors may only upload for
// patients assigned to them; patients are always pinned to their own record.
router.post(
  '/upload',
  requireRoles('admin', 'doctor', 'patient'),
  upload.single('file'),
  requireResourceOwnership(
    (req) => (req.user?.role === 'patient' ? req.user.patientId : req.body?.patientId),
    'patient'
  ),
  DocumentController.upload
);

// Download / View secure document
router.get('/:id/download', requireRoles('admin', 'doctor', 'patient'), DocumentController.download);

// Delete document (Admin or Uploader)
router.delete('/:id', requireRoles('admin', 'doctor', 'patient'), DocumentController.delete);

// Get documents for specific patient
router.get(
  '/patient/:patientId',
  requireRoles('admin', 'doctor', 'patient'),
  requireResourceOwnership((req) => req.params.patientId as string, 'patient'),
  DocumentController.getByPatientId
);

export default router;
