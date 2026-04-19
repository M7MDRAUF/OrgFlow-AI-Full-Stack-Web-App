import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  getUserHandler,
  listUsersHandler,
  updateUserHandler,
  updateUserStatusHandler,
} from './user.controller.js';
import { listUsersQuerySchema, updateUserSchema, updateUserStatusSchema } from './user.schema.js';

export function createUsersRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  /**
   * @openapi
   * /users:
   *   get:
   *     tags: [Users]
   *     summary: List users in the organization
   *     parameters:
   *       - in: query
   *         name: role
   *         schema: { type: string }
   *       - in: query
   *         name: teamId
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Array of users
   */
  router.get('/', validate({ query: listUsersQuerySchema }), asyncHandler(listUsersHandler));
  /**
   * @openapi
   * /users/{id}:
   *   get:
   *     tags: [Users]
   *     summary: Get a single user by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: User details
   *       404:
   *         description: User not found
   */
  router.get('/:id', asyncHandler(getUserHandler));
  /**
   * @openapi
   * /users/{id}:
   *   patch:
   *     tags: [Users]
   *     summary: Update a user
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name: { type: string }
   *               role: { type: string }
   *     responses:
   *       200:
   *         description: Updated user
   *       404:
   *         description: User not found
   */
  router.patch('/:id', validate({ body: updateUserSchema }), asyncHandler(updateUserHandler));
  /**
   * @openapi
   * /users/{id}/status:
   *   patch:
   *     tags: [Users]
   *     summary: Update user active/inactive status
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status: { type: string, enum: [pending, active, disabled] }
   *     responses:
   *       200:
   *         description: Updated user status
   *       404:
   *         description: User not found
   */
  router.patch(
    '/:id/status',
    requireRole('admin'),
    validate({ body: updateUserStatusSchema }),
    asyncHandler(updateUserStatusHandler),
  );
  return router;
}
