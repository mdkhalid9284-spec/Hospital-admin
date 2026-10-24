import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { config } from '../config/index.js';
import { IMedicalDocument, DocumentCategory, UserRole } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';

export class DocumentService {
  /**
   * Validate file signature / magic bytes
   */
  public static validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 4) return false;

    // PDF Magic Bytes: %PDF (0x25 0x50 0x44 0x46)
    if (mimeType === 'application/pdf') {
      return (
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46
      );
    }

    // JPEG Magic Bytes: 0xFF 0xD8 0xFF
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    // PNG Magic Bytes: 0x89 0x50 0x4E 0x47
    if (mimeType === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }

    // WebP Magic Bytes: RIFF .... WEBP
    if (mimeType === 'image/webp') {
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46
      );
    }

    return false;
  }

  public static async uploadDocument(
    file: Express.Multer.File,
    data: {
      patientId: string;
      category: DocumentCategory;
      title: string;
      isExternalRecord?: boolean;
    },
    actor: { id: string; name: string; role: UserRole }
  ): Promise<IMedicalDocument> {
    const patient = db.patients.find((p) => p.id === data.patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${data.patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    // Validate MIME Type
    if (!config.storage.allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(
        `Invalid file type '${file.mimetype}'. Only PDF and images (JPEG, PNG, WebP) are permitted.`,
        400,
        'INVALID_MIME_TYPE'
      );
    }

    // Validate File Size (Max 10MB)
    const maxBytes = config.storage.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new AppError(
        `File size exceeds configured limit of ${config.storage.maxFileSizeMb}MB.`,
        413,
        'FILE_TOO_LARGE'
      );
    }

    // Validate Magic Bytes
    if (!this.validateMagicBytes(file.buffer, file.mimetype)) {
      throw new AppError(
        'File content signature does not match declared MIME format.',
        400,
        'INVALID_FILE_SIGNATURE'
      );
    }

    // Generate safe storage key
    const fileExt = path.extname(file.originalname) || '.bin';
    const safeKey = `${uuidv4()}${fileExt.toLowerCase()}`;
    const targetPath = path.join(config.storage.localPath, safeKey);

    // Ensure storage directory exists
    if (!fs.existsSync(config.storage.localPath)) {
      fs.mkdirSync(config.storage.localPath, { recursive: true });
    }

    // Write file securely
    await fs.promises.writeFile(targetPath, file.buffer);

    const docId = `doc-${uuidv4().substring(0, 8)}`;
    const newDoc: IMedicalDocument = {
      id: docId,
      patientId: patient.id,
      patientName: patient.fullName,
      uploadedBy: actor.id,
      uploaderRole: actor.role,
      category: data.category,
      title: data.title,
      originalFilename: file.originalname,
      safeStorageKey: safeKey,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      isExternalRecord: Boolean(data.isExternalRecord),
      createdAt: new Date().toISOString(),
    };

    db.documents.unshift(newDoc);

    logAuditEvent(actor, 'DOCUMENT_UPLOADED', 'MedicalDocument', newDoc.id, 'SUCCESS', undefined, {
      patientId: patient.id,
      category: newDoc.category,
      title: newDoc.title,
      fileSizeBytes: newDoc.fileSizeBytes,
      mimeType: newDoc.mimeType,
    });

    return newDoc;
  }

  public static async getFileStream(
    docId: string,
    actor: { id: string; name: string; role: UserRole; patientId?: string; doctorId?: string }
  ): Promise<{ filePath: string; document: IMedicalDocument }> {
    const doc = db.documents.find((d) => d.id === docId);
    if (!doc) {
      throw new AppError(`Document with ID '${docId}' not found.`, 404, 'DOCUMENT_NOT_FOUND');
    }

    // Authorization check
    if (actor.role === 'patient') {
      if (actor.patientId !== doc.patientId) {
        throw new AppError('Forbidden. You can only access your own medical documents.', 403, 'FORBIDDEN_DOCUMENT_ACCESS');
      }
    } else if (actor.role === 'doctor') {
      // Doctor can access assigned patients
      const patient = db.patients.find((p) => p.id === doc.patientId);
      if (patient?.assignedDoctorId !== actor.doctorId && doc.uploadedBy !== actor.id) {
        // Allow if doctor uploaded or is assigned
        throw new AppError('Forbidden. You can only access documents of your assigned patients.', 403, 'FORBIDDEN_DOCUMENT_ACCESS');
      }
    }

    const filePath = path.join(config.storage.localPath, doc.safeStorageKey);
    if (!fs.existsSync(filePath)) {
      throw new AppError('The requested file is no longer available in storage.', 404, 'FILE_MISSING');
    }

    logAuditEvent(actor, 'DOCUMENT_DOWNLOADED', 'MedicalDocument', doc.id, 'SUCCESS', undefined, {
      filename: doc.originalFilename,
    });

    return { filePath, document: doc };
  }

  public static async deleteDocument(
    docId: string,
    actor: { id: string; name: string; role: UserRole }
  ): Promise<void> {
    const index = db.documents.findIndex((d) => d.id === docId);
    if (index === -1) {
      throw new AppError(`Document with ID '${docId}' not found.`, 404, 'DOCUMENT_NOT_FOUND');
    }

    const doc = db.documents[index];

    // Only Admin or the original uploader can delete
    if (actor.role !== 'admin' && doc.uploadedBy !== actor.id) {
      throw new AppError('Forbidden. Only administrators or the uploader can delete this document.', 403, 'FORBIDDEN_DOCUMENT_DELETE');
    }

    // Remove file if exists
    const filePath = path.join(config.storage.localPath, doc.safeStorageKey);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.warn(`[Document] Could not remove physical file ${filePath}`, err);
      }
    }

    db.documents.splice(index, 1);

    logAuditEvent(actor, 'DOCUMENT_DELETED', 'MedicalDocument', doc.id, 'SUCCESS', undefined, {
      title: doc.title,
      category: doc.category,
    });
  }

  public static async getByPatientId(patientId: string): Promise<IMedicalDocument[]> {
    return db.documents.filter((d) => d.patientId === patientId);
  }

  public static async getAll(): Promise<IMedicalDocument[]> {
    return db.documents;
  }
}
