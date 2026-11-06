import { Request, Response, NextFunction } from 'express';
import { db } from '../database/index.js';

/**
 * Serialises API requests in one instance, refreshes the in-memory snapshot
 * from the durable store before handling, and commits changes before the
 * response leaves the process.
 *
 * This is what makes writes durable on Vercel: the serverless response is not
 * sent until the database write has completed. Requests are serialised per
 * instance so the refresh -> mutate -> persist cycle cannot interleave.
 */
let requestQueue: Promise<void> = Promise.resolve();

export const persistenceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!db.isReady || db.persistenceMode === 'memory') {
    next();
    return;
  }

  // Health checks should stay cheap and should not wait behind a write.
  if (req.originalUrl === '/api/health' || req.path === '/health') {
    next();
    return;
  }

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = requestQueue;
  requestQueue = previous.then(() => gate).catch(() => undefined);

  previous
    .catch(() => undefined)
    .then(async () => {
      let settled = false;
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      const releaseQueue = (): void => {
        if (settled) return;
        settled = true;
        release();
      };

      const commitAndSend = (send: () => void): void => {
        if (settled) return;
        settled = true;

        db.persist()
          .then(() => {
            release();
            send();
          })
          .catch((error) => {
            release();
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[Persistence] Commit failed for ${req.method} ${req.originalUrl}:`, message);

            if (!res.headersSent) {
              res.status(500);
              originalJson({
                success: false,
                error: {
                  code: 'PERSISTENCE_FAILED',
                  message:
                    'The change could not be committed to persistent storage. No partial record was confirmed. Please retry.',
                },
              });
            }
          });
      };

      const onAborted = (): void => {
        releaseQueue();
      };
      req.on('aborted', onAborted);
      res.on('close', () => {
        // Handlers that stream or never call json/send still release the queue.
        if (!settled) commitAndSend(() => undefined);
      });

      try {
        await db.refreshFromStorage();
      } catch (error) {
        req.off('aborted', onAborted);
        releaseQueue();
        next(error);
        return;
      }

      res.json = ((body: any) => {
        req.off('aborted', onAborted);
        commitAndSend(() => originalJson(body));
        return res;
      }) as Response['json'];

     res.send = ((body: any) => {
  // res.json() internally calls res.send().
  // If the JSON wrapper has already committed, send directly.
  if (settled) {
    return originalSend(body);
  }

  req.off('aborted', onAborted);
  commitAndSend(() => originalSend(body));
  return res;
}) as Response['send'];
      next();
    })
    .catch((error) => {
      release();
      next(error);
    });
};
