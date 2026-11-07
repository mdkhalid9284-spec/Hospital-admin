import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { revokedTokens } from '../middlewares/auth.middleware.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { AppError } from '../middlewares/errorHandler.js';
import { verifyFirebaseIdToken, revokeFirebaseSessions, isFirebaseAdminConfigured } from '../services/firebaseAdmin.service.js';
import { FirebaseAccountService } from '../services/firebaseAccount.service.js';
import { db } from '../database/index.js';

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
      if ('linked' in result && result.linked) {
        res.status(200).json({
          success: true,
          data: { linked: true, email: result.user.email, user: result.user },
        });
        return;
      }
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async prepareExistingPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await FirebaseAccountService.prepareExistingPatient(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async completeExistingPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identity = await verifyFirebaseIdToken(AuthController.bearer(req));
      const result = await FirebaseAccountService.completeExistingPatient(identity, req.body.claimToken);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async registerNewPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identity = await verifyFirebaseIdToken(AuthController.bearer(req));
      const result = await FirebaseAccountService.registerNewPatient(identity, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async session(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identity = await verifyFirebaseIdToken(AuthController.bearer(req));
      const result = FirebaseAccountService.establishSession(identity);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  private static bearer(req: Request): string {
    const header = req.headers.authorization;
    const token = header && header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (!token) {
      throw new AppError('Access denied. No authentication token provided.', 401, 'UNAUTHORIZED');
    }
    return token;
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
      if (isFirebaseAdminConfigured() && req.user) {
        const account = db.users.find((user) => user.id === req.user?.id);
        if (account?.firebaseUid) {
          await revokeFirebaseSessions(account.firebaseUid);
        }
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
