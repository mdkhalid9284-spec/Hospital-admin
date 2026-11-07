import path from 'path';
import { getBackendRoot, loadBackendEnv } from './env.js';

// Always load backend/.env before reading process.env — independent of cwd.
loadBackendEnv();

const backendRoot = getBackendRoot();

const resolveStorageDriver = (): 'local' | 'vercel-blob' => {
  const raw = (process.env.STORAGE_DRIVER ?? '').trim();
  if (raw === '' || raw === 'local') return 'local';
  if (raw === 'vercel-blob') return 'vercel-blob';
  throw new Error("Invalid STORAGE_DRIVER. Expected 'local' or 'vercel-blob'.");
};

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  jwt: {
    secret: process.env.JWT_SECRET || 'hospitalcare-dev-jwt-secret-key-32-chars-min',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'hospitalcare-dev-refresh-secret-key-32-chars',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  database: {
    mongoUri: (process.env.MONGODB_URI || '').trim(),
    /** Local JSON snapshot used only when MongoDB is not configured in development. */
    localSnapshotPath:
      process.env.PERSISTENCE_FILE || path.join(backendRoot, 'storage', 'hospitalcare_db.json'),
    sqlType: (process.env.SQL_DATABASE_TYPE as 'sqlite' | 'postgres') || 'sqlite',
    sqlitePath:
      process.env.SQL_DATABASE_PATH || path.join(backendRoot, 'storage', 'hospitalcare_financial.sqlite'),
  },

  teleconsultation: {
    provider: process.env.TELECONSULT_PROVIDER || 'jitsi',
    baseUrl: (process.env.TELECONSULT_BASE_URL || 'https://meet.jit.si').replace(/\/+$/, ''),
  },

  storage: {
    driver: resolveStorageDriver(),
    localPath: process.env.STORAGE_LOCAL_PATH || path.join(backendRoot, 'storage', 'uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '200', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '5', 10),
  },

  notification: {
    provider: process.env.NOTIFICATION_PROVIDER || 'mock',
    from: process.env.NOTIFICATION_FROM || 'no-reply@hospitalcare.local',
  },
};
