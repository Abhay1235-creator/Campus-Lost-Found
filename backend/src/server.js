const { createApp } = require('./app');
const { connectDatabase, closeDatabase } = require('./database');
const { createMemoryDatabase } = require('./memory-database');

async function start() {
  const inMemory = process.env.USE_IN_MEMORY_DB === 'true';
  const db = inMemory ? createMemoryDatabase() : await connectDatabase();
  if (inMemory) console.warn('Using volatile in-memory demo storage. Data will be lost when the server stops.');
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '127.0.0.1';
  const server = createApp(db).listen(port, host, () => {
    console.log(`Lost-and-found API listening at http://${host}:${port}`);
  });

  async function shutdown() {
    server.close(async () => {
      if (!inMemory) await closeDatabase();
      process.exit(0);
    });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Failed to start API:', error.message);
  process.exitCode = 1;
});
