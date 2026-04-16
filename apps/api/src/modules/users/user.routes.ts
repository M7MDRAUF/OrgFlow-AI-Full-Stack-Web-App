import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
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
  router.get('/', validate({ query: listUsersQuerySchema }), asyncHandler(listUsersHandler));
  router.get('/:id', asyncHandler(getUserHandler));
  router.patch('/:id', validate({ body: updateUserSchema }), asyncHandler(updateUserHandler));
  router.patch(
    '/:id/status',
    validate({ body: updateUserStatusSchema }),
    asyncHandler(updateUserStatusHandler),
  );
  return router;
}
