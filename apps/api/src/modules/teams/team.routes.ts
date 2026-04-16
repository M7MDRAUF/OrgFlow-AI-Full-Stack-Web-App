import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createTeamHandler,
  deleteTeamHandler,
  getTeamHandler,
  listTeamsHandler,
  updateTeamHandler,
} from './team.controller.js';
import { createTeamSchema, updateTeamSchema } from './team.schema.js';

export function createTeamsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.get('/', asyncHandler(listTeamsHandler));
  router.get('/:id', asyncHandler(getTeamHandler));
  router.post('/', validate({ body: createTeamSchema }), asyncHandler(createTeamHandler));
  router.patch('/:id', validate({ body: updateTeamSchema }), asyncHandler(updateTeamHandler));
  router.delete('/:id', asyncHandler(deleteTeamHandler));
  return router;
}
