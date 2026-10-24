import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IAuditLog } from '../models/types.js';

export const logAuditEvent = (
  actor: { id: string; name: string; role: any },
  action: string,
  resourceType: string,
  resourceId: string,
  status: 'SUCCESS' | 'FAILURE',
  ipAddress?: string,
  details?: Record<string, any>
): void => {
  // Sanitize details to never log passwords or secrets
  const sanitizedDetails = details ? { ...details } : {};
  delete sanitizedDetails.password;
  delete sanitizedDetails.passwordHash;
  delete sanitizedDetails.token;
  delete sanitizedDetails.secret;

  const logEntry: IAuditLog = {
    id: `aud-${uuidv4().substring(0, 8)}`,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    resourceType,
    resourceId,
    status,
    ipAddress,
    details: sanitizedDetails,
  };

  db.auditLogs.unshift(logEntry);
};

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  req.requestId = (req.headers['x-request-id'] as string) || `req-${uuidv4().substring(0, 8)}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
};
