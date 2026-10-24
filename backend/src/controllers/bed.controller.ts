import { Request, Response, NextFunction } from 'express';
import { BedService } from '../services/bed.service.js';

export class BedController {
  public static async getBedBoard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const board = await BedService.getBedBoard();
      res.status(200).json({
        success: true,
        data: board,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const { wardId, roomNumber, bedNumber, status } = req.body;
      const bed = await BedService.updateStatus(wardId, roomNumber, bedNumber, status, {
        id: user.id,
        name: user.fullName,
        role: user.role,
      });
      res.status(200).json({
        success: true,
        data: { bed },
      });
    } catch (err) {
      next(err);
    }
  }
}
