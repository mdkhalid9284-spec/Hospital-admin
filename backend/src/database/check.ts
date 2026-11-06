import mongoose from 'mongoose';
import { loadBackendEnv, assertRequiredEnv } from '../config/env.js';
import { config } from '../config/index.js';
import { connectMongo, disconnectMongo, mongoHostname } from './mongo.js';

async function checkConnection(): Promise<void> {
  loadBackendEnv();
  assertRequiredEnv(['MONGODB_URI']);

  const hostname = mongoHostname(config.database.mongoUri) ?? '(unknown host)';
  console.log(`[db:check] Using env file: backend/.env`);
  console.log(`[db:check] Connecting to ${hostname} ...`);

  await connectMongo();

  const database = mongoose.connection.db;
  if (!database) {
    throw new Error('MongoDB connection did not expose a database handle.');
  }

  await database.admin().ping();
  console.log('[db:check] Ping succeeded. MongoDB Atlas is reachable and credentials are valid.');
}

void (async () => {
  try {
    await checkConnection();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[db:check] Connection failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await disconnectMongo().catch(() => undefined);
  }
})();
