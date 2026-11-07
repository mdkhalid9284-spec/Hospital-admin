import { Request, Response, NextFunction } from 'express';
import { DocumentService, DocumentActor } from '../services/document.service.js';
import { AppError } from '../middlewares/errorHandler.js';
import { DownloadStream, toNodeReadable } from '../services/fileStorage.service.js';

const toActor = (user: NonNullable<Request['user']>): DocumentActor => ({
  id: user.id,
  name: user.fullName,
  role: user.role,
  patientId: user.patientId,
  doctorId: user.doctorId,
});

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
        toActor(user)
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
      const { stream, size, document } = await DocumentService.getFileStream(
        req.params.id as string,
        toActor(user)
      );

      const safeName = document.originalFilename.replace(/["\r\n\\/]/g, '_').slice(0, 180) || 'document';
      res.status(200);
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(
          document.originalFilename
        )}`
      );
      if (typeof size === 'number' && Number.isFinite(size) && size >= 0) {
        res.setHeader('Content-Length', String(size));
      }
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      DocumentController.pipeDownload(res, stream, next);
    } catch (err) {
      next(err);
    }
  }

  private static pipeDownload(res: Response, stream: DownloadStream, next: NextFunction): void {
    const nodeStream = toNodeReadable(stream);
    let settled = false;

    const fail = (error: unknown): void => {
      if (settled || res.writableEnded) return;
      settled = true;
      nodeStream.destroy();
      if (!res.headersSent) {
        next(
          error instanceof AppError
            ? error
            : new AppError('The document could not be read from storage.', 502, 'STORAGE_READ_FAILED')
        );
        return;
      }
      res.destroy();
    };

    nodeStream.on('error', fail);
    res.on('close', () => {
      if (!res.writableFinished) nodeStream.destroy();
    });

    nodeStream.pipe(res);
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      await DocumentService.deleteDocument(req.params.id, toActor(user));

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
      const user = req.user!;
      const documents = await DocumentService.getByPatientId(req.params.patientId, toActor(user));
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
      const documents = await DocumentService.getAll(toActor(user));

      res.status(200).json({
        success: true,
        data: { documents },
      });
    } catch (err) {
      next(err);
    }
  }
}
