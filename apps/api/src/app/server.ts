// Entry point — bootstraps HTTP server with graceful shutdown.
import type { Server } from 'node:http';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { getLogger } from '../config/logger.js';
import { createApp } from './app.js';
import { loadEnv } from './env.js';

const SHUTDOWN_TIMEOUT_MS = 15_000;

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = getLogger(env);
  try {
    await connectDatabase(env);
  } catch (err) {
    logger.error({ err }, 'failed to connect to mongodb');
    process.exit(1);
  }
  const app = createApp(env);
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`[api] listening on port ${String(env.PORT)} (${env.NODE_ENV})`);
  });

  // Graceful shutdown handler — close HTTP connections first, then DB.
  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutdown signal received, draining connections…');

    // Force-kill safety net so the process never hangs indefinitely.
    const forceTimer = setTimeout(() => {
      logger.error('graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    // Unref so the timer alone does not keep the event loop alive.
    forceTimer.unref();

    server.close(() => {
      logger.info('http server closed');
      disconnectDatabase()
        .then(() => {
          logger.info('mongodb disconnected, exiting');
          process.exit(0);
        })
        .catch((err: unknown) => {
          logger.error({ err }, 'error during db disconnect');
          process.exit(1);
        });
    });
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
}

main().catch((err: unknown) => {
  console.error('fatal bootstrap error', err);
  process.exit(1);
});
