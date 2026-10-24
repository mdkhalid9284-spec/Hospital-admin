import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service.js';
import { AppError } from '../middlewares/errorHandler.js';

export class DocumentController {
  public static async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No document file was uploaded.', 400, 'FILE_MISSING');
      }

      const user = req.user!;
      let targetPatientId = req.body.patientId;
      if (user.role === 'patient') {
        targetPatientId = user.patientId!;
      }

      const doc = await DocumentService.uploadDocument(
        req.file,
        {
          patientId: targetPatientId,
          category: req.body.category,
          title: req.body.title,
          isExternalRecord: req.body.isExternalRecord === 'true' || req.body.isExternalRecord === true,
        },
        { id: user.id, name: user.fullName, role: user.role }
      );

      res.status(201).json({
        success: true,
        data: { document: doc },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { filePath, document } = await DocumentService.getFileStream(req.params.id, {
        id: user.id,
        name: user.fullName,
        role: user.role,
        patientId: user.patientId,
        doctorId: user.doctorId,
      });

      res.setHeader('Content-Type', document.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(document.originalFilename)}"`
      );
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      await DocumentService.deleteDocument(req.params.id, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        data: { message: 'Document deleted successfully.' },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getByPatientId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documents = await DocumentService.getByPatientId(req.params.patientId);
      res.status(200).json({
        success: true,
        data: { documents },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let documents;
      if (user.role === 'patient') {
        documents = await DocumentService.getByPatientId(user.patientId!);
      } else {
        documents = await DocumentService.getAll();
      }

      res.status(200).json({
        success: true,
        data: { documents },
      });
    } catch (err) {
      next(err);
    }
  }
}
