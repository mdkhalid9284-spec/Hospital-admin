import { Request, Response, NextFunction } from 'express';
import { InsuranceService } from '../services/insurance.service.js';

export class InsuranceController {
  public static async submitClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let targetPatientId = req.body.patientId;
      if (user.role === 'patient') {
        targetPatientId = user.patientId!;
      }

      const claim = await InsuranceService.submitClaim(
        { ...req.body, patientId: targetPatientId },
        { id: user.id, name: user.fullName, role: user.role }
      );

      res.status(201).json({
        success: true,
        data: { claim },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateClaimStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const claim = await InsuranceService.updateClaimStatus(req.params.id, req.body, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        data: { claim },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let claims;
      if (user.role === 'patient') {
        claims = await InsuranceService.getByPatientId(user.patientId!);
      } else {
        claims = await InsuranceService.getAll();
      }

      res.status(200).json({
        success: true,
        data: { claims },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getByPatientId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const claims = await InsuranceService.getByPatientId(req.params.patientId);
      res.status(200).json({
        success: true,
        data: { claims },
      });
    } catch (err) {
      next(err);
    }
  }
}
