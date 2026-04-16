import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
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
  router.get('/', validate({ query: listProjectsQuerySchema }), asyncHandler(listProjectsHandler));
  router.get('/:id', asyncHandler(getProjectHandler));
  router.post('/', validate({ body: createProjectSchema }), asyncHandler(createProjectHandler));
  router.patch('/:id', validate({ body: updateProjectSchema }), asyncHandler(updateProjectHandler));
  router.delete('/:id', asyncHandler(deleteProjectHandler));
  return router;
}
