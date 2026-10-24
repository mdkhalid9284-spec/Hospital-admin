import { Request, Response, NextFunction } from 'express';
import { DoctorService } from '../services/doctor.service.js';

export class DoctorController {
  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctors = await DoctorService.getAll();
      res.status(200).json({
        success: true,
        data: { doctors },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctor = await DoctorService.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: { doctor },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async assignPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { doctorId, patientId } = req.body;
      await DoctorService.assignPatientToDoctor(doctorId, patientId, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });
      res.status(200).json({
        success: true,
        data: { message: 'Doctor assignment updated successfully.' },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const doctor = await DoctorService.createDoctor(req.body, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });
      res.status(201).json({
        success: true,
        data: { doctor },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const doctor = await DoctorService.updateDoctor(req.params.id, req.body, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });
      res.status(200).json({
        success: true,
        data: { doctor },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async toggleStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const doctor = await DoctorService.toggleStatus(req.params.id, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });
      res.status(200).json({
        success: true,
        data: { doctor },
      });
    } catch (err) {
      next(err);
    }
  }
}
