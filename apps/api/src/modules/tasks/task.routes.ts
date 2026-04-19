import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  createCommentHandler,
  createTaskHandler,
  deleteTaskHandler,
  getTaskHandler,
  listCommentsHandler,
  listTasksHandler,
  updateTaskHandler,
  updateTaskStatusHandler,
} from './task.controller.js';
import {
  createCommentSchema,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from './task.schema.js';

export function createTasksRouter(): Router {
  const router = Router();
  router.use(authMiddleware);

  /**
   * @openapi
   * /tasks:
   *   get:
   *     tags: [Tasks]
   *     summary: List tasks with filters
   *     parameters:
   *       - in: query
   *         name: projectId
   *         schema: { type: string }
   *       - in: query
   *         name: status
   *         schema: { type: string }
   *       - in: query
   *         name: assigneeId
   *         schema: { type: string }
   *       - in: query
   *         name: priority
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Array of tasks
   */
  router.get('/', validate({ query: listTasksQuerySchema }), asyncHandler(listTasksHandler));
  /**
   * @openapi
   * /tasks/{id}:
   *   get:
   *     tags: [Tasks]
   *     summary: Get a single task by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Task details
   *       404:
   *         description: Task not found
   */
  router.get('/:id', asyncHandler(getTaskHandler));
  /**
   * @openapi
   * /tasks:
   *   post:
   *     tags: [Tasks]
   *     summary: Create a new task
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [title, projectId]
   *             properties:
   *               title: { type: string }
   *               description: { type: string }
   *               projectId: { type: string }
   *               assigneeId: { type: string }
   *               priority: { type: string, enum: [low, medium, high, urgent] }
   *               dueDate: { type: string, format: date-time }
   *     responses:
   *       201:
   *         description: Created task
   */
  router.post('/', validate({ body: createTaskSchema }), asyncHandler(createTaskHandler));
  /**
   * @openapi
   * /tasks/{id}:
   *   patch:
   *     tags: [Tasks]
   *     summary: Update a task
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
   *               title: { type: string }
   *               description: { type: string }
   *               assigneeId: { type: string }
   *               priority: { type: string }
   *               dueDate: { type: string, format: date-time }
   *     responses:
   *       200:
   *         description: Updated task
   *       404:
   *         description: Task not found
   */
  router.patch('/:id', validate({ body: updateTaskSchema }), asyncHandler(updateTaskHandler));
  /**
   * @openapi
   * /tasks/{id}/status:
   *   patch:
   *     tags: [Tasks]
   *     summary: Update task status
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
   *               status: { type: string, enum: [todo, in_progress, in_review, done] }
   *     responses:
   *       200:
   *         description: Updated task status
   *       404:
   *         description: Task not found
   */
  router.patch(
    '/:id/status',
    validate({ body: updateTaskStatusSchema }),
    asyncHandler(updateTaskStatusHandler),
  );
  /**
   * @openapi
   * /tasks/{id}:
   *   delete:
   *     tags: [Tasks]
   *     summary: Delete a task
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Task deleted
   *       404:
   *         description: Task not found
   */
  router.delete('/:id', asyncHandler(deleteTaskHandler));
  /**
   * @openapi
   * /tasks/{id}/comments:
   *   get:
   *     tags: [Tasks]
   *     summary: List comments for a task
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Array of comments
   *       404:
   *         description: Task not found
   */
  router.get('/:id/comments', asyncHandler(listCommentsHandler));
  /**
   * @openapi
   * /tasks/{id}/comments:
   *   post:
   *     tags: [Tasks]
   *     summary: Add a comment to a task
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
   *             required: [content]
   *             properties:
   *               content: { type: string }
   *     responses:
   *       201:
   *         description: Created comment
   *       404:
   *         description: Task not found
   */
  router.post(
    '/:id/comments',
    validate({ body: createCommentSchema }),
    asyncHandler(createCommentHandler),
  );
  return router;
}
