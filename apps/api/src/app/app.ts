import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import type { AppEnv } from './env.js';
import { createApiRouter } from './router.js';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware.js';
import { sendSuccess } from '../utils/response.js';

export function createApp(env: AppEnv): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
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

  app.use(env.API_BASE_PATH, createApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
