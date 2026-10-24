import { Request, Response, NextFunction } from 'express';
import { PrescriptionService } from '../services/prescription.service.js';

export class PrescriptionController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const prescription = await PrescriptionService.createPrescription(
        {
          ...req.body,
          doctorId: user.doctorId || req.body.doctorId,
        },
        { id: user.id, name: user.fullName, role: user.role }
      );

      res.status(201).json({
        success: true,
        data: { prescription },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getByPatientId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prescriptions = await PrescriptionService.getByPatientId(req.params.patientId);
      res.status(200).json({
        success: true,
        data: { prescriptions },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prescriptions = await PrescriptionService.getAll();
      res.status(200).json({
        success: true,
        data: { prescriptions },
      });
    } catch (err) {
      next(err);
    }
  }
}
