// Centralized pino logger (platform-agent, AGENTS.md §4.3).
import pino, { type Logger } from 'pino';
import type { AppEnv } from '../app/env.js';

let cached: Logger | null = null;

export function getLogger(env: AppEnv): Logger {
  if (cached !== null) return cached;
  const base = {
    level: env.LOG_LEVEL,
    redact: {
      // OBS-002 (Expert Test Master Plan §4.10): every secret-shaped key must
      // be redacted at the structured-log boundary, including AI-specific
      // payload keys that could leak embedding vectors or chunk content.
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        '*.password',
        '*.passwordHash',
        '*.token',
        'token',
        '*.inviteToken',
        '*.inviteTokenHash',
        '*.embedding',
        'embedding',
        '*.vector',
        'vector',
        '*.queryVector',
        'queryVector',
        '*.secret',
      ],
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
