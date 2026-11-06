import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // Normalise multer upload limit errors into the platform's error envelope.
  if (err && err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      err = new AppError('File size exceeds the 10MB limit.', 413, 'FILE_TOO_LARGE');
    } else {
      err = new AppError(`File upload rejected: ${err.message}.`, 400, 'INVALID_UPLOAD');
    }
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  const message =
    statusCode === 500 && config.nodeEnv === 'production'
      ? 'An internal server error occurred. Please contact hospital support.'
      : err.message || 'Something went wrong.';

  // Securely log the internal error without exposing sensitive internals to client
  console.error(`[Error] [${req.requestId}] ${req.method} ${req.originalUrl}:`, err);

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId: req.requestId,
      ...(err.details !== undefined ? { details: err.details } : {}),
    },
  });
};
