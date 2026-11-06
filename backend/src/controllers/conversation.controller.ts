import { Request, Response, NextFunction } from 'express';
import { ConversationService, ChatActor } from '../services/conversation.service.js';

const actorFrom = (req: Request): ChatActor => ({
  id: req.user!.id,
  fullName: req.user!.fullName,
  role: req.user!.role,
  patientId: req.user!.patientId,
  doctorId: req.user!.doctorId,
});

export class ConversationController {
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = actorFrom(req);
      res.status(200).json({
        success: true,
        data: {
          conversations: ConversationService.listForUser(actor),
          unreadCount: ConversationService.unreadCount(actor),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversation = ConversationService.getOrCreate(req.body, actorFrom(req));
      res.status(201).json({
        success: true,
        data: { conversation },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const conversation = ConversationService.getById(req.params.id, actorFrom(req));
      const messages = ConversationService.getMessages(req.params.id, actorFrom(req));
      res.status(200).json({
        success: true,
        data: { conversation, messages },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const message = ConversationService.sendMessage(
        req.params.id,
        req.body.body,
        actorFrom(req)
      );
      res.status(201).json({
        success: true,
        data: { message },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const messages = ConversationService.markRead(req.params.id, actorFrom(req));
      res.status(200).json({
        success: true,
        data: { messages },
      });
    } catch (err) {
      next(err);
    }
  }
}
