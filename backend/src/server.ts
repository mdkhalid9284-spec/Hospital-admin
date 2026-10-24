import { createApp } from './app.js';
import { config } from './config/index.js';
import { db } from './database/index.js';

const startServer = async () => {
  try {
    // Initialize Database and Seed Store
    await db.initialize();

    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`🏥 HospitalCare API Server running in ${config.nodeEnv} mode`);
      console.log(`📡 URL: http://localhost:${config.port}`);
      console.log(`🔗 API Base: http://localhost:${config.port}${config.apiPrefix}`);
      console.log(`🛡️  RBAC & IDOR Protections: ACTIVE`);
      console.log(`====================================================`);
    });

    const shutdown = () => {
      console.log('\n[HospitalCare] Gracefully terminating server...');
      server.close(() => {
        console.log('[HospitalCare] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[HospitalCare] Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();
