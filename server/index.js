import { createApp } from './app.js';
import { defaultDatabasePath } from './db.js';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a whole number from 1 to 65535.');
}
const app = createApp({ dbPath: process.env.DATABASE_PATH || defaultDatabasePath });
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`HealthCoverSim is running at http://127.0.0.1:${port}`);
});

server.on('error', (error) => {
  console.error(`Could not start HealthCoverSim: ${error.message}`);
  app.close();
  process.exitCode = 1;
});

const shutdown = () => server.close(() => app.close());
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
