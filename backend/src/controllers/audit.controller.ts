import { Request, Response, NextFunction } from 'express';
import { db } from '../database/index.js';

export class AuditController {
  public static async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const offset = (page - 1) * limit;

      const total = db.auditLogs.length;
      const logs = db.auditLogs.slice(offset, offset + limit);

      res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
