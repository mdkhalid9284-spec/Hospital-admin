import { Request, Response, NextFunction } from 'express';
import { PatientService } from '../services/patient.service.js';

export class PatientController {
  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

      const user = req.user!;
      const result = await PatientService.getAll({ search, limit, offset }, user.role, user.doctorId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patient = await PatientService.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: { patient },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async checkDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const candidates = PatientService.findDuplicateCandidates(req.body);
      res.status(200).json({
        success: true,
        data: { candidates, hasStrongMatch: candidates.some((candidate) => candidate.isStrongMatch) },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const patient = await PatientService.create(req.body, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });
      res.status(201).json({
        success: true,
        data: { patient },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const patient = await PatientService.update(req.params.id, req.body, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });
      res.status(200).json({
        success: true,
        data: { patient },
      });
    } catch (err) {
      next(err);
    }
  }
}
