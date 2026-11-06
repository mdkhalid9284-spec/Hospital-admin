import { createApp } from '../src/app.js';
import { db } from '../src/database/index.js';

let appPromise: Promise<ReturnType<typeof createApp>> | undefined;

function getApp(): Promise<ReturnType<typeof createApp>> {
  if (!appPromise) {
    appPromise = db
      .initialize()
      .then(() => createApp())
      .catch((error: unknown) => {
        // Do not cache a rejected initialization. A transient Atlas/DNS failure
        // should be retried by the next serverless invocation.
        appPromise = undefined;
        throw error;
      });
  }

  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error('[HospitalCare] Serverless startup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Backend initialization failed'
    });
  }
}
