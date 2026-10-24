import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { config } from '../config/index.js';
import { IMedicalDocument, DocumentCategory, UserRole, IPatient } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';

export interface DocumentActor {
  id: string;
  name: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
}

const VALID_CATEGORIES: DocumentCategory[] = [
  'Prescription',
  'Report',
  'Scan',
  'Bill',
  'Insurance',
  'Other',
];

export class DocumentService {
  /**
   * Validate file signature / magic bytes.
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

  private static getPatientOrThrow(patientId: string): IPatient {
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }
    return patient;
  }

  private static assertPatientAccess(patient: IPatient, actor: DocumentActor): void {
    if (actor.role === 'admin') return;

    if (actor.role === 'patient') {
      if (actor.patientId !== patient.id) {
        throw new AppError(
          'Forbidden. You can only access your own medical documents.',
          403,
          'FORBIDDEN_DOCUMENT_ACCESS'
        );
      }
      return;
    }

    if (actor.role === 'doctor') {
      if (patient.assignedDoctorId !== actor.doctorId) {
        throw new AppError(
          'Forbidden. You can only access documents of your assigned patients.',
          403,
          'FORBIDDEN_DOCUMENT_ACCESS'
        );
      }
      return;
    }

    throw new AppError(
      'Forbidden. Your role is not authorized to access clinical documents.',
      403,
      'FORBIDDEN_DOCUMENT_ACCESS'
    );
  }

  public static async uploadDocument(
    file: Express.Multer.File,
    data: {
      patientId: string;
      category: DocumentCategory;
      title: string;
      isExternalRecord?: boolean;
    },
    actor: DocumentActor
  ): Promise<IMedicalDocument> {
    const patient = this.getPatientOrThrow(data.patientId);
    this.assertPatientAccess(patient, actor);

    const title = (data.title ?? '').trim();
    if (title.length < 2 || title.length > 200) {
      throw new AppError(
        'A document title between 2 and 200 characters is required.',
        400,
        'INVALID_DOCUMENT_TITLE'
      );
    }
    if (!VALID_CATEGORIES.includes(data.category)) {
      throw new AppError(
        `Invalid document category '${data.category}'.`,
        400,
        'INVALID_DOCUMENT_CATEGORY'
      );
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

    // Generate an unguessable storage key that is never exposed as a public path.
    const fileExt = path.extname(file.originalname) || '.bin';
    const safeKey = `${uuidv4()}${fileExt.toLowerCase()}`;
    const targetPath = path.join(config.storage.localPath, safeKey);

    if (!fs.existsSync(config.storage.localPath)) {
      fs.mkdirSync(config.storage.localPath, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, file.buffer);

    const docId = `doc-${uuidv4().substring(0, 8)}`;
    const newDoc: IMedicalDocument = {
      id: docId,
      patientId: patient.id,
      patientName: patient.fullName,
      uploadedBy: actor.id,
      uploaderRole: actor.role,
      category: data.category,
      title,
      originalFilename: path.basename(file.originalname).slice(0, 255),
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
    actor: DocumentActor
  ): Promise<{ filePath: string; document: IMedicalDocument }> {
    const doc = db.documents.find((d) => d.id === docId);
    if (!doc) {
      throw new AppError(`Document with ID '${docId}' not found.`, 404, 'DOCUMENT_NOT_FOUND');
    }

    if (actor.role === 'admin') {
      // Admin may access all documents.
    } else if (actor.role === 'patient') {
      if (actor.patientId !== doc.patientId) {
        throw new AppError(
          'Forbidden. You can only access your own medical documents.',
          403,
          'FORBIDDEN_DOCUMENT_ACCESS'
        );
      }
    } else if (actor.role === 'doctor') {
      const patient = db.patients.find((p) => p.id === doc.patientId);
      if (patient?.assignedDoctorId !== actor.doctorId && doc.uploadedBy !== actor.id) {
        throw new AppError(
          'Forbidden. You can only access documents of your assigned patients.',
          403,
          'FORBIDDEN_DOCUMENT_ACCESS'
        );
      }
    } else {
      throw new AppError(
        'Forbidden. Your role is not authorized to access clinical documents.',
        403,
        'FORBIDDEN_DOCUMENT_ACCESS'
      );
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
    actor: DocumentActor
  ): Promise<void> {
    const index = db.documents.findIndex((d) => d.id === docId);
    if (index === -1) {
      throw new AppError(`Document with ID '${docId}' not found.`, 404, 'DOCUMENT_NOT_FOUND');
    }

    const doc = db.documents[index];

    // Only Admin or the original uploader can delete.
    if (actor.role !== 'admin' && doc.uploadedBy !== actor.id) {
      throw new AppError(
        'Forbidden. Only administrators or the uploader can delete this document.',
        403,
        'FORBIDDEN_DOCUMENT_DELETE'
      );
    }

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

  public static async getByPatientId(
    patientId: string,
    actor?: DocumentActor
  ): Promise<IMedicalDocument[]> {
    const patient = this.getPatientOrThrow(patientId);
    if (actor) {
      this.assertPatientAccess(patient, actor);
    }
    return db.documents.filter((d) => d.patientId === patientId);
  }

  public static async getAll(actor: DocumentActor): Promise<IMedicalDocument[]> {
    if (actor.role === 'admin') {
      return db.documents;
    }

    if (actor.role === 'patient') {
      return db.documents.filter((doc) => doc.patientId === actor.patientId);
    }

    if (actor.role === 'doctor') {
      const assignedPatientIds = new Set(
        db.patients
          .filter((patient) => patient.assignedDoctorId === actor.doctorId)
          .map((patient) => patient.id)
      );
      return db.documents.filter(
        (doc) => assignedPatientIds.has(doc.patientId) || doc.uploadedBy === actor.id
      );
    }

    throw new AppError(
      'Forbidden. Your role is not authorized to access clinical documents.',
      403,
      'FORBIDDEN_DOCUMENT_ACCESS'
    );
  }
}
