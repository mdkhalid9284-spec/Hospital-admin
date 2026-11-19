import { Request, Response, NextFunction } from 'express';
import { db } from '../database/index.js';

/**
 * Performance-optimized persistence middleware.
 *
 * 1. Safe HTTP methods (GET, HEAD, OPTIONS) are strictly read-only and bypass
 *    the persistence write lifecycle entirely. They execute concurrently without
 *    queuing or database round-trips.
 *
 * 2. Mutation methods (POST, PUT, PATCH, DELETE) execute their route handlers,
 *    and upon successful mutation (status < 400), commit changed documents to
 *    durable storage (MongoDB Atlas or local snapshot) before the response leaves
 *    the process.
 *
 * 3. Full-collection reload (17 collections across Atlas) is removed from the
 *    per-request path, eliminating the multi-second latency and 15s timeout crashes.
 */

// Mutex queue specifically for mutation writes to preserve atomic commit ordering
let mutationQueue: Promise<void> = Promise.resolve();

export const persistenceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!db.isReady || db.persistenceMode === 'memory') {
    next();
    return;
  }

  // Safe read requests: completely bypass write queuing and collection reloading
  const isReadMethod = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  if (isReadMethod || req.path === '/api/health' || req.path === '/health') {
    next();
    return;
  }

  // For mutations (POST, PUT, PATCH, DELETE):
  // Coordinate writes so mutations commit cleanly without interleaving diffs
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = mutationQueue;
  mutationQueue = previous.then(() => gate).catch(() => undefined);

  previous
    .catch(() => undefined)
    .then(() => {
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

        // Only persist if the mutation succeeded (2xx or 3xx status)
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        if (!isSuccess) {
          release();
          send();
          return;
        }

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
        if (!settled) commitAndSend(() => undefined);
      });

      res.json = ((body: any) => {
        req.off('aborted', onAborted);
        commitAndSend(() => originalJson(body));
        return res;
      }) as Response['json'];

      res.send = ((body: any) => {
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
