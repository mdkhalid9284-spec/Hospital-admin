import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { revokedTokens } from '../middlewares/auth.middleware.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async patientSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.registerPatientAccount(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const result = await AuthService.login(email, password, ip);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      await AuthService.forgotPassword(email);
      // Never return the reset token to the client — it is delivered out-of-band.
      res.status(200).json({
        success: true,
        data: {
          message: 'If an account exists for this email, a password reset link has been dispatched.',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      await AuthService.resetPassword(token, newPassword);
      res.status(200).json({
        success: true,
        data: { message: 'Password has been successfully updated.' },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: { user: req.user },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
      if (token) {
        revokedTokens.add(token);
      }
      // Audit the logout (actor context is available on req.user)
      if (req.user) {
        logAuditEvent(
          { id: req.user.id, name: req.user.fullName, role: req.user.role },
          'USER_LOGOUT',
          'User',
          req.user.id,
          'SUCCESS'
        );
      }
      res.status(200).json({
        success: true,
        data: { message: 'Session terminated successfully.' },
      });
    } catch (err) {
      next(err);
    }
  }
}
