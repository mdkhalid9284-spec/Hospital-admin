import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from '../services/appointment.service.js';
import { db } from '../database/index.js';
import { AppError } from '../middlewares/errorHandler.js';

export class AppointmentController {
  public static async getAvailableSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : '';
      const date = typeof req.query.date === 'string' ? req.query.date : '';
      if (!doctorId || !date) {
        throw new AppError(
          'Both doctorId and date query parameters are required.',
          400,
          'MISSING_QUERY_PARAMETERS'
        );
      }
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

      // Doctors may only schedule their own assigned patients.
      if (user.role === 'doctor') {
        const patient = db.patients.find((p) => p.id === targetPatientId);
        if (!patient || patient.assignedDoctorId !== user.doctorId) {
          throw new AppError(
            'Forbidden. You can only schedule appointments for your assigned patients.',
            403,
            'IDOR_FORBIDDEN'
          );
        }
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

      const existing = db.appointments.find((a) => a.id === req.params.id);
      if (!existing) {
        throw new AppError(
          `Appointment with ID '${req.params.id}' not found.`,
          404,
          'APPOINTMENT_NOT_FOUND'
        );
      }

      // Row-level ownership: patients only manage their own appointments and
      // may only cancel; doctors only manage appointments in their own clinic.
      if (user.role === 'patient') {
        if (existing.patientId !== user.patientId) {
          throw new AppError(
            'Access denied. You can only manage your own appointments.',
            403,
            'IDOR_FORBIDDEN'
          );
        }
        if (status !== 'Cancelled') {
          throw new AppError(
            'Patients may only cancel an appointment.',
            403,
            'FORBIDDEN',
          );
        }
      }
      if (user.role === 'doctor' && existing.doctorId !== user.doctorId) {
        throw new AppError(
          'Access denied. You can only manage appointments in your own clinic.',
          403,
          'IDOR_FORBIDDEN'
        );
      }

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
