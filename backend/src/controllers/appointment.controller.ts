import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from '../services/appointment.service.js';

export class AppointmentController {
  public static async getAvailableSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctorId = req.query.doctorId as string;
      const date = req.query.date as string;
      const slots = await AppointmentService.getDoctorAvailableSlots(doctorId, date);
      res.status(200).json({
        success: true,
        data: slots,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async book(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      // If patient is booking, ensure they book for their own patientId
      let targetPatientId = req.body.patientId;
      if (user.role === 'patient') {
        targetPatientId = user.patientId!;
      }

      const appointment = await AppointmentService.bookAppointment(
        { ...req.body, patientId: targetPatientId },
        { id: user.id, name: user.fullName, role: user.role }
      );

      res.status(201).json({
        success: true,
        data: { appointment },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { status, notes } = req.body;
      const appointment = await AppointmentService.updateStatus(
        req.params.id,
        status,
        notes,
        { id: user.id, name: user.fullName, role: user.role }
      );

      res.status(200).json({
        success: true,
        data: { appointment },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let appointments;
      if (user.role === 'patient') {
        appointments = await AppointmentService.getByPatientId(user.patientId!);
      } else if (user.role === 'doctor') {
        appointments = await AppointmentService.getByDoctorId(user.doctorId!);
      } else {
        appointments = await AppointmentService.getAll();
      }

      res.status(200).json({
        success: true,
        data: { appointments },
      });
    } catch (err) {
      next(err);
    }
  }
}
