import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { db } from '../database/index.js';
import { UserRole } from '../models/types.js';
import { AppError } from './errorHandler.js';
import { isFirebaseAdminConfigured, verifyFirebaseIdToken } from '../services/firebaseAdmin.service.js';

const verificationExempt = (req: Request): boolean => {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  return ['/api/auth/me', '/api/auth/logout', '/api/auth/session'].some(
    (allowed) => path === allowed || path.endsWith(allowed)
  );
};

const sendAuthError = (res: Response, status: number, code: string, message: string): void => {
  res.status(status).json({
    success: false,
    error: { code, message },
  });
};

/**
 * Server-side revocation store for JWT access tokens.
 * Logout adds the token here so it is rejected on subsequent requests,
 * giving authenticated sessions a real termination path beyond client-side
 * localStorage clearing.
 */
export const revokedTokens = new Set<string>();

export interface AuthenticatedUserPayload {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  patientId?: string;
  doctorId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserPayload;
      requestId?: string;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access denied. No authentication token provided.',
      },
    });
    return;
  }

  if (revokedTokens.has(token)) {
    sendAuthError(res, 401, 'TOKEN_REVOKED', 'Session has been terminated. Please log in again.');
    return;
  }

  try {
    if (isFirebaseAdminConfigured()) {
      try {
        const identity = await verifyFirebaseIdToken(token);
        const user = db.users.find((item) => item.firebaseUid === identity.uid && item.isActive);
        if (!user) {
          sendAuthError(
            res,
            401,
            'ACCOUNT_NOT_LINKED',
            'This sign-in is not linked to a HospitalCare account.'
          );
          return;
        }
        if (!identity.emailVerified && !verificationExempt(req)) {
          sendAuthError(
            res,
            403,
            'EMAIL_NOT_VERIFIED',
            'Verify your email before using protected hospital features.'
          );
          return;
        }

        let patientId: string | undefined;
        let doctorId: string | undefined;
        if (user.role === 'patient') {
          patientId = db.patients.find((patient) => patient.userId === user.id)?.id;
        } else if (user.role === 'doctor') {
          doctorId = db.doctors.find((doctor) => doctor.userId === user.id)?.id;
        }

        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          patientId,
          doctorId,
        };
        next();
        return;
      } catch (firebaseErr) {
        // Fallback to local JWT verification for transition/test suites
        try {
          const decoded = jwt.verify(token, config.jwt.secret) as AuthenticatedUserPayload;
          const user = db.users.find((u) => u.id === decoded.id && u.isActive);
          if (user) {
            let patientId: string | undefined;
            let doctorId: string | undefined;
            if (user.role === 'patient') {
              const patient = db.patients.find((p) => p.userId === user.id);
              if (patient) patientId = patient.id;
            } else if (user.role === 'doctor') {
              const doctor = db.doctors.find((d) => d.userId === user.id);
              if (doctor) doctorId = doctor.id;
            }

            req.user = {
              id: user.id,
              email: user.email,
              role: user.role,
              fullName: user.fullName,
              patientId,
              doctorId,
            };
            next();
            return;
          }
        } catch {
          // Not a valid JWT either
        }
        throw firebaseErr;
      }
    }

    const decoded = jwt.verify(token, config.jwt.secret) as AuthenticatedUserPayload;

    // Verify user still exists and is active
    const user = db.users.find((u) => u.id === decoded.id && u.isActive);
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'The user account is inactive or no longer exists.',
        },
      });
      return;
    }

    // Attach patientId or doctorId context if applicable
    let patientId: string | undefined;
    let doctorId: string | undefined;

    if (user.role === 'patient') {
      const patient = db.patients.find((p) => p.userId === user.id);
      if (patient) patientId = patient.id;
    } else if (user.role === 'doctor') {
      const doctor = db.doctors.find((d) => d.userId === user.id);
      if (doctor) doctorId = doctor.id;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      patientId,
      doctorId,
    };

    next();
  } catch (err) {
    if (err instanceof AppError) {
      sendAuthError(res, err.statusCode, err.code, err.message);
      return;
    }
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Session has expired or token is invalid. Please log in again.',
      },
    });
    return;
  }
};
