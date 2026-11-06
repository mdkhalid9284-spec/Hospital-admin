import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const envPath = path.join(backendRoot, '.env');

let loaded = false;

/**
 * Load backend/.env from a path anchored to this file, not process.cwd().
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function loadBackendEnv(): { path: string; loaded: boolean } {
  if (loaded) {
    return { path: envPath, loaded: fs.existsSync(envPath) };
  }

  const result = dotenv.config({ path: envPath });
  loaded = true;

  if (result.error && (result.error as NodeJS.ErrnoException).code !== 'ENOENT') {
    console.warn(`[Config] Could not read ${envPath}: ${result.error.message}`);
  }

  return { path: envPath, loaded: !result.error || (result.error as NodeJS.ErrnoException).code !== 'ENOENT' };
}

export function getBackendRoot(): string {
  return backendRoot;
}

export function getBackendEnvPath(): string {
  return envPath;
}

/** Validate required vars after load. Does not print secret values. */
export function assertRequiredEnv(keys: string[]): void {
  const missing = keys.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        `Set them in ${envPath} (never commit real credentials).`
    );
  }
}
