
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Express } from 'express';

import { createApp } from './app.js';
import { db } from './database/index.js';

let appPromise: Promise<Express> | undefined;

function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = db.initialize()
      .then(() => createApp())
      .catch((error) => {
        appPromise = undefined;
        throw error;
      });
  }

  return appPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const app = await getApp();
    app(req as any, res as any);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'HospitalCare API initialization failed.';
    const safeDetail = detail
      .replace(/vercel_blob_rw_[A-Za-z0-9_-]+/gi, '[redacted]')
      .replace(/BLOB_READ_WRITE_TOKEN\s*[=:]\s*\S+/gi, 'BLOB_READ_WRITE_TOKEN=[redacted]')
      .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[redacted]');
    const configurationError =
      detail.startsWith('STORAGE_DRIVER') ||
      detail.startsWith('Invalid STORAGE_DRIVER') ||
      detail.includes('BLOB_READ_WRITE_TOKEN is missing') ||
      detail.startsWith('Persistent storage is required');
    console.error('[HospitalCare] Serverless startup error:', safeDetail);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        success: false,
        message: configurationError ? safeDetail : 'HospitalCare API initialization failed.'
      }));
    }
  }
}
