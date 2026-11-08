import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/types.js';
import { db } from '../database/index.js';

/**
 * Authorizes access based on allowed roles.
 */
export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required before role authorization.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Role '${req.user.role}' is not authorized for this operation.`,
        },
      });
      return;
    }

    next();
  };
};

/**
 * IDOR Guard: Enforces resource ownership for Patients and Doctors.
 * Admins and Billing staff have overarching or specific authorization.
 */
export const requireResourceOwnership = (
  extractResourceId: (req: Request) => string | undefined,
  resourceType: 'patient' | 'doctor'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    // Admins bypass resource ownership checks
    if (req.user.role === 'admin') {
      return next();
    }

    const targetId = extractResourceId(req);

    if (resourceType === 'patient') {
      // Patients can only access their own patient record
      if (req.user.role === 'patient') {
        if (req.user.patientId !== targetId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'IDOR_FORBIDDEN',
              message: 'Access denied. You can only access your own patient records.',
            },
          });
          return;
        }
      }
      // Doctors can only access patients assigned to them
      if (req.user?.role === 'doctor' && req.user.doctorId) {
        const doctorId = req.user.doctorId;
        const patient = db.patients.find((p) => p.id === targetId);
        const doctor = db.doctors.find((d) => d.id === doctorId);
        const isAssigned =
          patient &&
          (patient.assignedDoctorId === doctorId ||
            Boolean(doctor?.assignedPatientIds.includes(patient.id)) ||
            db.appointments.some((a) => a.doctorId === doctorId && a.patientId === patient.id));

        if (!isAssigned) {
          res.status(403).json({
            success: false,
            error: {
              code: 'IDOR_FORBIDDEN',
              message: 'Access denied. Doctors can only access their assigned patients.',
            },
          });
          return;
        }
      }
    } else if (resourceType === 'doctor') {
      // If user is a doctor, they can only perform actions under their own doctor ID
      if (req.user.role === 'doctor') {
        if (req.user.doctorId !== targetId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'IDOR_FORBIDDEN',
              message: 'Access denied. Doctors can only operate on their own profile/actions.',
            },
          });
          return;
        }
      }
    }

    next();
  };
};
