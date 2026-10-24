import { createApp } from '../src/app.js';
import { db } from '../src/database/index.js';

let initialization: Promise<void> | undefined;

const appPromise = (async () => {
  initialization ??= db.initialize();
  await initialization;
  return createApp();
})();

export default async function handler(req: any, res: any) {
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('[HospitalCare] Serverless startup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Backend initialization failed'
    });
  }
}
