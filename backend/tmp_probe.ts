process.env.NODE_ENV = 'development';
process.env.MONGODB_URI = '';
process.env.PERSISTENCE_FILE = 'D:/HOSPITAL/backend/storage/verify_probe.json';

async function main() {
  const t0 = Date.now();
  const { db } = await import('./src/database/index.js');
  await db.initialize();
  console.log('init', Date.now() - t0, 'mode', db.persistenceMode);

  const t1 = Date.now();
  await db.refreshFromStorage();
  console.log('refresh', Date.now() - t1);

  const t2 = Date.now();
  await db.persist();
  console.log('persist', Date.now() - t2);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
