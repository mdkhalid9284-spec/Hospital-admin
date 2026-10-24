import dotenv from 'dotenv';
import path from 'path';

// Load environment configuration
dotenv.config();

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
    mongoUri: process.env.MONGODB_URI || '',
    sqlType: (process.env.SQL_DATABASE_TYPE as 'sqlite' | 'postgres') || 'sqlite',
    sqlitePath: process.env.SQL_DATABASE_PATH || path.join(process.cwd(), 'storage', 'hospitalcare_financial.sqlite'),
  },
  
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || path.join(process.cwd(), 'storage', 'uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS || '200', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '5', 10), // 5 failed tries
  },
  
  notification: {
    provider: process.env.NOTIFICATION_PROVIDER || 'mock',
    from: process.env.NOTIFICATION_FROM || 'no-reply@hospitalcare.local'
  }
};
