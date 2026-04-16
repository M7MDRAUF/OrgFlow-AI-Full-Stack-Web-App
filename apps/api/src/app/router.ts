// Central router. Domain modules register here during later milestones.
// Each module exports a router from its `*.routes.ts`. Keep this file small.
import { Router } from 'express';
import { sendSuccess } from '../utils/response.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';

export function createApiRouter(): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    sendSuccess(res, { name: 'orgflow-ai', version: '0.1.0' });
  });
  router.use('/auth', createAuthRouter());
  return router;
}
