import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { createSwaggerSpec } from '../config/swagger.js';
import { rateLimitStoreOptions } from '../config/rate-limit-store.js';
import { correlationIdMiddleware } from '../middleware/correlation-id.middleware.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';
import { sendSuccess } from '../utils/response.js';
import { getCorsOrigins, type AppEnv } from './env.js';
import { createApiRouter } from './router.js';

export function createApp(env: AppEnv): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
          fontSrc: ["'self'", 'cdn.jsdelivr.net'],
        },
      },
    }),
  );
  // I-006: attach correlation id before any routing or logging so every
  // subsequent log line can include it — including malformed-JSON errors.
  app.use(correlationIdMiddleware);
  // I-005: explicit allow-list, never '*'. Multiple origins are supported via
  // comma-separated CORS_ORIGIN. Requests from unknown origins are rejected.
  const allowedOrigins = getCorsOrigins(env);
  app.use(
    cors({
      origin(origin, cb) {
        if (origin === undefined || allowedOrigins.includes(origin)) {
          cb(null, true);
          return;
        }
        cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'ok' });
  });
  // OPS-02: /ready is the orchestrator's gate for routing live traffic. It
  // MUST exercise every external dependency the request path needs (Mongo +
  // Ollama) so a degraded backend stops receiving requests instead of
  // serving 5xx. Keep the budget small (3 s) so the probe itself never
  // becomes the source of slowness, and respond 503 with a structured
  // error envelope so probes / dashboards can introspect the failure mode.
  app.get('/ready', (_req: Request, res: Response) => {
    void (async () => {
      const checks: { mongo: 'ok' | 'down'; ollama: 'ok' | 'down' | 'skipped' } = {
        mongo: 'down',
        ollama: 'down',
      };

      // Mongo: drive a real ping rather than trusting the readyState flag,
      // which can lag behind a half-open connection.
      try {
        // Mongoose ConnectionStates.connected = 1 — use the enum for type
        // safety instead of a magic-number comparison.
        if (
          mongoose.connection.readyState === mongoose.ConnectionStates.connected &&
          mongoose.connection.db
        ) {
          await Promise.race([
            mongoose.connection.db.admin().ping(),
            new Promise((_, reject) =>
              setTimeout(() => {
                reject(new Error('mongo ping timeout'));
              }, 3_000),
            ),
          ]);
          checks.mongo = 'ok';
        }
      } catch {
        checks.mongo = 'down';
      }

      // Ollama: only block readiness on it in non-test environments. Test
      // runs frequently happen without Ollama and should not be marked
      // unhealthy for that reason alone.
      if (env.NODE_ENV === 'test') {
        checks.ollama = 'skipped';
      } else {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => {
            controller.abort();
          }, 3_000);
          try {
            const resp = await fetch(`${env.OLLAMA_HOST}/api/tags`, { signal: controller.signal });
            checks.ollama = resp.ok ? 'ok' : 'down';
          } finally {
            clearTimeout(timer);
          }
        } catch {
          checks.ollama = 'down';
        }
      }

      const ready = checks.mongo === 'ok' && checks.ollama !== 'down';
      if (ready) {
        sendSuccess(res, { status: 'ready', checks });
      } else {
        // /ready is an operational probe outside the typed `/api/v1` surface,
        // so it returns a plain 503 envelope rather than going through
        // `sendError` (which constrains `code` to the API_ERROR_CODES union).
        res.status(503).json({
          success: false,
          error: { code: 'NOT_READY', message: 'Service dependencies are not ready' },
          checks,
        });
      }
    })();
  });

  // F-007 / OPS-01: global rate-limit for all API traffic. Per-route
  // tighter limits for auth + chat are layered on top inside their own
  // route modules. The store is Redis-backed when REDIS_URL is set so
  // the budget holds across replicas; otherwise the in-process default
  // is used (single-replica dev/test).
  if (env.NODE_ENV !== 'test') {
    app.use(
      env.API_BASE_PATH,
      rateLimit({
        windowMs: 60_000,
        limit: 300,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        ...rateLimitStoreOptions('global'),
      }),
    );
  }

  // Swagger API docs — available in non-production environments.
  if (env.NODE_ENV !== 'production') {
    const spec = createSwaggerSpec(env);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
  }

  app.use(env.API_BASE_PATH, createApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
