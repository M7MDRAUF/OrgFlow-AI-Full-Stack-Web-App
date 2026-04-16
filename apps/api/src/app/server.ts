// Entry placeholder — platform-agent expands in Milestone 2.
// This minimal file ensures the workspace compiles cleanly after bootstrap.
import { createApp } from './app.js';
import { loadEnv } from './env.js';

function main(): void {
  const env = loadEnv();
  const app = createApp(env);
  app.listen(env.PORT, () => {
    console.info(`[api] listening on port ${String(env.PORT)} (${env.NODE_ENV})`);
  });
}

main();
