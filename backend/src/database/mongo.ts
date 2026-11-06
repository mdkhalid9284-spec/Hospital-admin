import mongoose from 'mongoose';
import { config } from '../config/index.js';

let connectionPromise: Promise<typeof mongoose> | null = null;

// If an established connection drops, clear the cached promise so the next
// caller attempts a real reconnect instead of awaiting an already-resolved one.
mongoose.connection.on('disconnected', () => {
  connectionPromise = null;
});

export function mongoHostname(uri: string): string | null {
  // Extract only the host[:port] part. Never log the full URI (credentials).
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/?]+)/i);
  return match?.[1] ?? null;
}

export function validateMongoUri(uri: string): void {
  if (!uri || !uri.trim()) {
    throw new Error('MONGODB_URI is missing from backend/.env');
  }

  const trimmed = uri.trim();
  if (!/^mongodb(\+srv)?:\/\//i.test(trimmed)) {
    throw new Error(
      'MONGODB_URI must start with mongodb:// or mongodb+srv://. ' +
        'Copy the Drivers connection string from Atlas > Database > Connect.'
    );
  }

  // userinfo is everything between // and the last @ before the host.
  const userInfoMatch = trimmed.match(/^mongodb(?:\+srv)?:\/\/([^@]+)@/i);
  if (!userInfoMatch) {
    throw new Error(
      'MONGODB_URI is missing username/password credentials before the host. ' +
        'Expected mongodb+srv://USERNAME:PASSWORD@host/...'
    );
  }

  const userInfo = userInfoMatch[1];
  const firstColon = userInfo.indexOf(':');
  if (firstColon <= 0 || firstColon === userInfo.length - 1) {
    throw new Error(
      'MONGODB_URI credentials are malformed. Expected USERNAME:PASSWORD before @host.'
    );
  }

  const password = userInfo.slice(firstColon + 1);
  // Characters that break URI userinfo unless percent-encoded.
  if (/[\/?#\[\]@]/.test(password) && !/%[0-9A-Fa-f]{2}/.test(password)) {
    throw new Error(
      'MONGODB_URI password contains reserved characters (/, ?, #, [, ], @) that are not URL-encoded. ' +
        'Percent-encode the password in backend/.env (for example "/" → "%2F", "@" → "%40").'
    );
  }
}

function toConnectionError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === 'object' && error && 'code' in error ? String((error as any).code) : '';

  const isAuthFailure =
    /bad auth|Authentication failed|auth failed|code 18\b/i.test(message) || code === '8000';
  if (isAuthFailure) {
    return new Error(
      'MongoDB Atlas rejected the database username/password in MONGODB_URI (bad auth). ' +
        'This is not a DNS or network issue. In Atlas: Database Access → select the database user → Edit → ' +
        'Edit Password (or create a new database user). Then update only the USERNAME:PASSWORD portion of ' +
        'MONGODB_URI in backend/.env. Do not commit credentials. URL-encode any special characters in the password.',
      { cause: error instanceof Error ? error : undefined }
    );
  }

  const isDnsFailure = /querySrv|ENOTFOUND|ENODATA|EAI_AGAIN|ESERVFAIL/i.test(message);
  if (isDnsFailure) {
    const hostname = mongoHostname(config.database.mongoUri) ?? 'the configured host';
    return new Error(
      `MongoDB hostname "${hostname}" could not be resolved (${message}). ` +
        'The hostname in MONGODB_URI is probably stale or mistyped. ' +
        'For Atlas, open Database > your cluster > Connect > Drivers, copy the current mongodb+srv:// URI, ' +
        'and update backend/.env locally. Do not commit or log the URI because it contains credentials.',
      { cause: error instanceof Error ? error : undefined }
    );
  }

  return error instanceof Error ? error : new Error(message);
}

export async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  validateMongoUri(config.database.mongoUri);

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(config.database.mongoUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      })
      .then((instance) => {
        console.log('[Database] MongoDB Atlas connected.');
        return instance;
      })
      .catch((error: unknown) => {
        connectionPromise = null;
        throw toConnectionError(error);
      });
  }

  await connectionPromise;
}

export async function disconnectMongo(): Promise<void> {
  connectionPromise = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
