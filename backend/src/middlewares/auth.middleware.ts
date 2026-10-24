import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { db } from '../database/index.js';
import { UserRole } from '../models/types.js';

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

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthenticatedUserPayload;

    // Reject server-revoked tokens (e.g. after logout)
    if (revokedTokens.has(token)) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Session has been terminated. Please log in again.',
        },
      });
      return;
    }

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
