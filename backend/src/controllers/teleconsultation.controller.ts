import { Request, Response, NextFunction } from 'express';
import {
  TeleconsultationService,
  TeleconsultActor,
} from '../services/teleconsultation.service.js';

const actorFrom = (req: Request): TeleconsultActor => ({
  id: req.user!.id,
  fullName: req.user!.fullName,
  role: req.user!.role,
  patientId: req.user!.patientId,
  doctorId: req.user!.doctorId,
});

export class TeleconsultationController {
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: { teleconsultations: TeleconsultationService.listForUser(actorFrom(req)) },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teleconsultation = TeleconsultationService.start(req.body, actorFrom(req));
      res.status(201).json({
        success: true,
        data: { teleconsultation },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teleconsultation = TeleconsultationService.getById(req.params.id, actorFrom(req));
      res.status(200).json({
        success: true,
        data: { teleconsultation },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async end(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teleconsultation = TeleconsultationService.end(req.params.id, actorFrom(req));
      res.status(200).json({
        success: true,
        data: { teleconsultation },
      });
    } catch (err) {
      next(err);
    }
  }
}
