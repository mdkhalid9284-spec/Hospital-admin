import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import apiRouter from './routes/index.js';
import { errorHandler, AppError } from './middlewares/errorHandler.js';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import { requestContextMiddleware } from './middlewares/audit.middleware.js';

export const createApp = (): Express => {
  const app = express();
app.set('trust proxy', 1);
  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", 'http://localhost:5000', 'ws://localhost:5000'],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      frameguard: { action: 'deny' },
      noSniff: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: config.nodeEnv === 'production',
      },
    })
  );

  // 2. CORS Restriction
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, tests) or matching configured client origin
        if (!origin) {
          callback(null, true);
          return;
        }

const allowed =
  origin === config.clientOrigin ||
  origin === 'https://hospital-admin-ivory.vercel.app' ||
  origin.startsWith('http://localhost') ||
  origin.startsWith('http://127.0.0.1');

        if (allowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  // 3. Request Logging (exclude in test mode)
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // 4. Request Context & Correlation ID
  app.use(requestContextMiddleware);

  // 5. Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. Global Rate Limiter
  app.use(config.apiPrefix, globalRateLimiter);

  // 7. Health Check Endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      system: 'HospitalCare API Service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // 8. Mount Master API Routes
  app.use(config.apiPrefix, apiRouter);

  // 9. 404 Handler for undefined routes
  app.use('*', (req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Route '${req.originalUrl}' does not exist on this server.`, 404, 'NOT_FOUND'));
  });

  // 10. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
