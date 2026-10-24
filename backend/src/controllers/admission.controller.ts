import { Request, Response, NextFunction } from 'express';
import { AdmissionService } from '../services/admission.service.js';
import { DischargeService } from '../services/discharge.service.js';

export class AdmissionController {
  public static async admit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const admission = await AdmissionService.admitPatient(req.body, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });
      res.status(201).json({
        success: true,
        data: { admission },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async discharge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const admission = await DischargeService.processDischarge(req.params.id, req.body, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });
      res.status(200).json({
        success: true,
        data: { admission },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.query.patientId as string | undefined;
      const admissions = patientId
        ? await AdmissionService.getByPatientId(patientId)
        : await AdmissionService.getAllAdmissions();

      res.status(200).json({
        success: true,
        data: { admissions },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const admission = await AdmissionService.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: { admission },
      });
    } catch (err) {
      next(err);
    }
  }
}
