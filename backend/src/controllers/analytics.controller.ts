import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';

export class AnalyticsController {
  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const range =
        typeof req.query.range === 'string' && req.query.range.length > 0
          ? req.query.range
          : '30d';
      const summary = await AnalyticsService.getSummaryMetrics(range);
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }
}
