import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { createSwaggerSpec } from '../config/swagger.js';
import { correlationIdMiddleware } from '../middleware/correlation-id.middleware.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';
import { sendSuccess } from '../utils/response.js';
import { getCorsOrigins, type AppEnv } from './env.js';
import { createApiRouter } from './router.js';

export function createApp(env: AppEnv): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
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
  app.get('/ready', (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'ready' });
  });

  // F-007: global rate-limit for all API traffic. Per-route tighter limits
  // for auth + chat are layered on top inside their own route modules.
  if (env.NODE_ENV !== 'test') {
    app.use(
      env.API_BASE_PATH,
      rateLimit({
        windowMs: 60_000,
        limit: 300,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
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
