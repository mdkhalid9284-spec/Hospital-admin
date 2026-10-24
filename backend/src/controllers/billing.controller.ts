import { Request, Response, NextFunction } from 'express';
import { BillService } from '../services/bill.service.js';

export class BillingController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const bill = await BillService.createBill(req.body, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        data: { bill },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const bill = await BillService.recordPayment(req.params.id, req.body.amountPaid, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        data: { bill },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      let bills;
      if (user.role === 'patient') {
        bills = await BillService.getByPatientId(user.patientId!);
      } else {
        bills = await BillService.getAll();
      }

      res.status(200).json({
        success: true,
        data: { bills },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getByPatientId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bills = await BillService.getByPatientId(req.params.patientId);
      res.status(200).json({
        success: true,
        data: { bills },
      });
    } catch (err) {
      next(err);
    }
  }
}
