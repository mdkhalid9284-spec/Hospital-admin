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
      const filters = BillingController.readFilters(req);
      let bills;
      if (user.role === 'patient') {
        bills = await BillService.getByPatientId(user.patientId!, filters);
      } else {
        bills = await BillService.getAll(filters);
      }

      res.status(200).json({
        success: true,
        data: { bills, total: bills.length },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getByPatientId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bills = await BillService.getByPatientId(
        req.params.patientId,
        BillingController.readFilters(req)
      );
      res.status(200).json({
        success: true,
        data: { bills, total: bills.length },
      });
    } catch (err) {
      next(err);
    }
  }

  private static readFilters(req: Request): { from?: string; to?: string } {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    return { from, to };
  }
}
