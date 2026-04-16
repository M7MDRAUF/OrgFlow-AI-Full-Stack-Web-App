import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import type { AppEnv } from './env.js';

// Bootstrap placeholder. Middleware stack (auth/scope/validate/error) and
// module routes are wired by platform-agent + domain agents in later stages.
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
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.get('/ready', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, data: { status: 'ready' } });
  });

  return app;
}
