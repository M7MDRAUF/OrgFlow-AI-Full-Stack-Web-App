import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createCommentHandler,
  createTaskHandler,
  deleteTaskHandler,
  getTaskHandler,
  listCommentsHandler,
  listTasksHandler,
  updateTaskHandler,
} from './task.controller.js';
import {
  createCommentSchema,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from './task.schema.js';

export function createTasksRouter(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.get('/', validate({ query: listTasksQuerySchema }), asyncHandler(listTasksHandler));
  router.get('/:id', asyncHandler(getTaskHandler));
  router.post('/', validate({ body: createTaskSchema }), asyncHandler(createTaskHandler));
  router.patch('/:id', validate({ body: updateTaskSchema }), asyncHandler(updateTaskHandler));
  router.delete('/:id', asyncHandler(deleteTaskHandler));
  router.get('/:id/comments', asyncHandler(listCommentsHandler));
  router.post(
    '/:id/comments',
    validate({ body: createCommentSchema }),
    asyncHandler(createCommentHandler),
  );
  return router;
}
