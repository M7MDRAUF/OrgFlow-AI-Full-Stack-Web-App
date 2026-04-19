import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  createTeamHandler,
  deleteTeamHandler,
  getTeamHandler,
  listTeamsHandler,
  updateTeamHandler,
} from './team.controller.js';
import { createTeamSchema, listTeamsQuerySchema, updateTeamSchema } from './team.schema.js';

export function createTeamsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  /**
   * @openapi
   * /teams:
   *   get:
   *     tags: [Teams]
   *     summary: List all teams in the organization
   *     responses:
   *       200:
   *         description: Array of teams
   */
  router.get('/', validate({ query: listTeamsQuerySchema }), asyncHandler(listTeamsHandler));
  /**
   * @openapi
   * /teams/{id}:
   *   get:
   *     tags: [Teams]
   *     summary: Get a single team by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Team details
   *       404:
   *         description: Team not found
   */
  router.get('/:id', asyncHandler(getTeamHandler));
  /**
   * @openapi
   * /teams:
   *   post:
   *     tags: [Teams]
   *     summary: Create a new team
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name: { type: string }
   *               description: { type: string }
   *               memberIds: { type: array, items: { type: string } }
   *     responses:
   *       201:
   *         description: Created team
   */
  router.post(
    '/',
    requireRole('admin'),
    validate({ body: createTeamSchema }),
    asyncHandler(createTeamHandler),
  );
  /**
   * @openapi
   * /teams/{id}:
   *   patch:
   *     tags: [Teams]
   *     summary: Update a team
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
   *               description: { type: string }
   *               memberIds: { type: array, items: { type: string } }
   *     responses:
   *       200:
   *         description: Updated team
   *       404:
   *         description: Team not found
   */
  router.patch(
    '/:id',
    requireRole('admin'),
    validate({ body: updateTeamSchema }),
    asyncHandler(updateTeamHandler),
  );
  /**
   * @openapi
   * /teams/{id}:
   *   delete:
   *     tags: [Teams]
   *     summary: Delete a team
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Team deleted
   *       404:
   *         description: Team not found
   */
  router.delete('/:id', requireRole('admin'), asyncHandler(deleteTeamHandler));
  return router;
}
