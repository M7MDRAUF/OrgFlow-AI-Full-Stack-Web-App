import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  getCurrentOrganizationHandler,
  updateCurrentOrganizationHandler,
} from './organization.controller.js';
import { updateOrganizationSchema } from './organization.schema.js';

export function createOrganizationsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  /**
   * @openapi
   * /organizations/current:
   *   get:
   *     tags: [Organizations]
   *     summary: Get the current user's organization
   *     responses:
   *       200:
   *         description: Organization details
   */
  router.get('/current', asyncHandler(getCurrentOrganizationHandler));
  /**
   * @openapi
   * /organizations/current:
   *   patch:
   *     tags: [Organizations]
   *     summary: Update the current organization (admin only)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name: { type: string }
   *     responses:
   *       200:
   *         description: Updated organization
   *       403:
   *         description: Admin role required
   */
  router.patch(
    '/current',
    requireRole('admin'),
    validate({ body: updateOrganizationSchema }),
    asyncHandler(updateCurrentOrganizationHandler),
  );
  return router;
}
