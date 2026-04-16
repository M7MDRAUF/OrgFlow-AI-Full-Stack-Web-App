// Entry placeholder — platform-agent expands in Milestone 2.
// This minimal file ensures the workspace compiles cleanly after bootstrap.
import { createApp } from './app.js';
import { loadEnv } from './env.js';
import { connectDatabase } from '../config/db.js';
import { getLogger } from '../config/logger.js';

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
  app.listen(env.PORT, () => {
    logger.info(`[api] listening on port ${String(env.PORT)} (${env.NODE_ENV})`);
  });
}

main().catch((err: unknown) => {
  console.error('fatal bootstrap error', err);
  process.exit(1);
});
