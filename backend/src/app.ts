import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import { db } from './database/index.js';
import { isMongoConnected, mongoHostname } from './database/mongo.js';
import apiRouter from './routes/index.js';
import { errorHandler, AppError } from './middlewares/errorHandler.js';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import { requestContextMiddleware } from './middlewares/audit.middleware.js';
import { persistenceMiddleware } from './middlewares/persistence.middleware.js';

export const createApp = (): Express => {
  const app = express();
app.set('trust proxy', 1);
  // 1. Security Headers via Helmet
  app.use(
    (typeof helmet === 'function' ? helmet : (helmet as any).default || helmet)({
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

  // 4b. Performance & Request Telemetry Logging
  if (config.nodeEnv !== 'test') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (duration > 500) {
          console.warn(
            `[PERF WARNING] Slow API: ${req.method} ${req.originalUrl} returned ${res.statusCode} in ${duration}ms [${new Date().toISOString()}]`
          );
        }
      });
      next();
    });
  }

  // 5. Body Parsing (increased limit for complex clinical documents & batches)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 5b. Persistent-storage refresh + write-through commit.
  // Every successful mutation is committed before the HTTP response is sent.
  app.use(persistenceMiddleware);

  // 6. Health Check Endpoint
  // Kept ahead of the rate limiter and readiness guard so operators can always
  // distinguish "still starting" from "process not running".
  const handleHealth = (req: Request, res: Response) => {
    const mongoConfigured = Boolean(config.database.mongoUri);
    const databaseConnected = mongoConfigured ? isMongoConnected() : true;
    const ready = db.isReady && databaseConnected;
    const status: 'healthy' | 'starting' | 'degraded' = ready
      ? 'healthy'
      : (db.lastInitializationError || (mongoConfigured && !databaseConnected && db.isReady))
        ? 'degraded'
        : 'starting';

    res.status(ready ? 200 : 503).json({
      success: ready,
      status,
      system: 'HospitalCare API Service',
      version: '1.0.0',
      persistenceMode: db.persistenceMode,
      persistenceTarget: mongoConfigured ? 'mongo' : 'file',
      databaseReady: ready,
      databaseConnected,
      ...(mongoConfigured ? { databaseHost: mongoHostname(config.database.mongoUri) } : {}),
      ...(status !== 'healthy' && db.lastInitializationError
        ? { message: db.lastInitializationError }
        : {}),
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/api/health', handleHealth);
  app.get('/health', handleHealth);

  // 7. Readiness guard: fail fast with a machine-readable 503 instead of
  // leaving login/session requests hanging while storage is still starting.
  app.use(config.apiPrefix, (req: Request, res: Response, next: NextFunction) => {
    // Tests construct the app directly around an in-memory fixture database.
    if (config.nodeEnv === 'test' || db.isReady) {
      next();
      return;
    }

    // Trigger an initialization attempt if not already running
    void db.initialize().catch(() => undefined);

    res.setHeader('Retry-After', '5');
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_NOT_READY',
        message:
          'HospitalCare storage is still starting or reconnecting. The API will become available automatically; retry shortly.',
      },
    });
  });

  // 8. Global Rate Limiter
  app.use(config.apiPrefix, globalRateLimiter);

  // 9. Mount Master API Routes
  app.use(config.apiPrefix, apiRouter);

  // 10. 404 Handler for undefined routes
  app.use('*', (req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Route '${req.originalUrl}' does not exist on this server.`, 404, 'NOT_FOUND'));
  });

  // 11. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
