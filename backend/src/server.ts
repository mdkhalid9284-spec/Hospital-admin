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

    // 1. Establish required storage before accepting HTTP traffic.
    await db.initialize();

    // 2. Create Express app only after the database is ready.
    const app = createApp();

    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`HospitalCare API Server running in ${config.nodeEnv} mode`);
      console.log(`Listening on port ${config.port}`);
      console.log(`URL: http://localhost:${config.port}`);
      console.log(`API Base: http://localhost:${config.port}${config.apiPrefix}`);
      console.log(`Persistence mode: ${db.persistenceMode}`);
      console.log(`====================================================`);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[HospitalCare] Fatal startup error:', message);
    process.exit(1);
  }
};

void startServer();
