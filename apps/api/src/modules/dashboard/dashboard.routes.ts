import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { getDashboardHandler } from './dashboard.controller.js';

export function createDashboardRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  /**
   * @openapi
   * /dashboard:
   *   get:
   *     tags: [Dashboard]
   *     summary: Get dashboard statistics for the current user
   *     responses:
   *       200:
   *         description: Dashboard summary data
   */
  router.get('/', asyncHandler(getDashboardHandler));
  return router;
}
