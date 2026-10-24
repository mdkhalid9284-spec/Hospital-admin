import { Request, Response, NextFunction } from 'express';
import { MedicalRecordService } from '../services/record.service.js';

export class RecordController {
  public static async createClinicalNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const record = await MedicalRecordService.createNote(
        {
          ...req.body,
          doctorId: user.doctorId || req.body.doctorId,
        },
        { id: user.id, name: user.fullName, role: user.role }
      );

      res.status(201).json({
        success: true,
        data: { record },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateClinicalNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const record = await MedicalRecordService.updateNote(
        req.params.id,
        req.body,
        { id: user.id, name: user.fullName, role: user.role }
      );
      res.status(200).json({
        success: true,
        data: { record },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getByPatientId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const records = await MedicalRecordService.getByPatientId(req.params.patientId);
      res.status(200).json({
        success: true,
        data: { records },
      });
    } catch (err) {
      next(err);
    }
  }
}
