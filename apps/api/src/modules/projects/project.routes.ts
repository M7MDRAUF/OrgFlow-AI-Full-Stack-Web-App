import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  createProjectHandler,
  deleteProjectHandler,
  getProjectHandler,
  listProjectsHandler,
  updateProjectHandler,
} from './project.controller.js';
import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from './project.schema.js';

export function createProjectsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  /**
   * @openapi
   * /projects:
   *   get:
   *     tags: [Projects]
   *     summary: List projects
   *     parameters:
   *       - in: query
   *         name: teamId
   *         schema: { type: string }
   *       - in: query
   *         name: status
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Array of projects
   */
  router.get('/', validate({ query: listProjectsQuerySchema }), asyncHandler(listProjectsHandler));
  /**
   * @openapi
   * /projects/{id}:
   *   get:
   *     tags: [Projects]
   *     summary: Get a single project by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Project details
   *       404:
   *         description: Project not found
   */
  router.get('/:id', asyncHandler(getProjectHandler));
  /**
   * @openapi
   * /projects:
   *   post:
   *     tags: [Projects]
   *     summary: Create a new project
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, teamId]
   *             properties:
   *               name: { type: string }
   *               description: { type: string }
   *               teamId: { type: string }
   *     responses:
   *       201:
   *         description: Created project
   */
  router.post('/', validate({ body: createProjectSchema }), asyncHandler(createProjectHandler));
  /**
   * @openapi
   * /projects/{id}:
   *   patch:
   *     tags: [Projects]
   *     summary: Update a project
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
   *               status: { type: string }
   *     responses:
   *       200:
   *         description: Updated project
   *       404:
   *         description: Project not found
   */
  router.patch('/:id', validate({ body: updateProjectSchema }), asyncHandler(updateProjectHandler));
  /**
   * @openapi
   * /projects/{id}:
   *   delete:
   *     tags: [Projects]
   *     summary: Delete a project
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Project deleted
   *       404:
   *         description: Project not found
   */
  router.delete('/:id', asyncHandler(deleteProjectHandler));
  return router;
}
