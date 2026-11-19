import { createApp } from './app.js';
import { config } from './config/index.js';
import { getBackendEnvPath } from './config/env.js';
import { db } from './database/index.js';
import { disconnectMongo } from './database/mongo.js';

const startServer = async () => {
  try {
    console.log(`[HospitalCare] Loading environment from ${getBackendEnvPath()}`);
    console.log(`[HospitalCare] Persistence target: ${config.database.mongoUri ? 'MongoDB Atlas' : 'local JSON snapshot'}`);
    console.log(`[HospitalCare] Document storage: ${config.storage.driver}`);

    // 1. Create Express app and start listening immediately so health checks
    // and clients connect without timing out while storage initializes.
    const app = createApp();

    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`HospitalCare API Server running in ${config.nodeEnv} mode`);
      console.log(`Listening on port ${config.port}`);
      console.log(`URL: http://localhost:${config.port}`);
      console.log(`API Base: http://localhost:${config.port}${config.apiPrefix}`);
      console.log(`Persistence target: ${config.database.mongoUri ? 'MongoDB Atlas' : 'local JSON snapshot'}`);
      console.log(`====================================================`);
    });

    // Ensure server socket timeouts are aligned to prevent hung connections
    server.timeout = 30000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;

    // 2. Initialize storage. If initial connection fails, the server
    // remains active in degraded mode and retries when requests arrive.
    db.initialize()
      .then(() => {
        console.log(`[HospitalCare] Storage initialized successfully. Persistence mode: ${db.persistenceMode}`);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        const safeMessage = message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[redacted]');
        console.error('[HospitalCare] Initial storage connection failed:', safeMessage);
        console.error('[HospitalCare] Server is running in degraded mode. Health endpoint is active.');
      });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `[HospitalCare] Port ${config.port} is already in use. Stop the other process or set PORT in backend/.env.`
        );
      } else {
        console.error('[HospitalCare] HTTP server error:', error.message);
      }
      process.exit(1);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n[HospitalCare] ${signal} received — shutting down...`);
      server.close(async () => {
        try {
          await disconnectMongo();
        } catch {
          // ignore disconnect errors during shutdown
        }
        console.log('[HospitalCare] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
      const safeMessage = message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[redacted]');
      console.error('[HospitalCare] Handled asynchronous rejection (process preserved):', safeMessage);
    });

    process.on('uncaughtException', (error) => {
      const message = error.stack || error.message;
      const safeMessage = message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[redacted]');
      console.error('[HospitalCare] Uncaught exception:', safeMessage);
      if ((error as any).code === 'EADDRINUSE') {
        process.exit(1);
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[HospitalCare] Fatal startup error:', message);
    process.exit(1);
  }
};

void startServer();
