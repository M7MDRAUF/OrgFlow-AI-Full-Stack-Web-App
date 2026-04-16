// Centralized pino logger (platform-agent, AGENTS.md §4.3).
import pino, { type Logger } from 'pino';
import type { AppEnv } from '../app/env.js';

let cached: Logger | null = null;

export function getLogger(env: AppEnv): Logger {
  if (cached !== null) return cached;
  const base = {
    level: env.LOG_LEVEL,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash'],
      censor: '[redacted]',
    },
  };
  cached =
    env.NODE_ENV === 'development'
      ? pino({
          ...base,
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
          },
        })
      : pino(base);
  return cached;
}
