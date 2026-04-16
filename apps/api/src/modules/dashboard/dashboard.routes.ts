import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getDashboardHandler } from './dashboard.controller.js';

export function createDashboardRouter(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.get('/', asyncHandler(getDashboardHandler));
  return router;
}
