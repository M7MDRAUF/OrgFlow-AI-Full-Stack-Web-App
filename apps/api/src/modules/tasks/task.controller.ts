import type { Request, Response } from 'express';
import { errors } from '../../utils/errors.js';
import { paginationSchema } from '../../utils/pagination.js';
import { requireParam } from '../../utils/request.js';
import { sendSuccess } from '../../utils/response.js';
import type {
  CreateCommentInput,
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from './task.schema.js';
import * as taskService from './task.service.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function listTasksHandler(req: Request, res: Response): Promise<void> {
  const pagination = paginationSchema.parse(req.query);
  const { items, total } = await taskService.listTasks(
    requireAuth(req),
    req.query as unknown as ListTasksQuery,
    pagination,
  );
  sendSuccess(
    res,
    { tasks: items },
    {
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        hasMore: pagination.page * pagination.pageSize < total,
      },
    },
  );
}

export async function getTaskHandler(req: Request, res: Response): Promise<void> {
  const task = await taskService.getTask(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, { task });
}

export async function createTaskHandler(req: Request, res: Response): Promise<void> {
  const task = await taskService.createTask(requireAuth(req), req.body as CreateTaskInput);
  sendSuccess(res, { task }, { status: 201 });
}

export async function updateTaskHandler(req: Request, res: Response): Promise<void> {
  const task = await taskService.updateTask(
    requireAuth(req),
    requireParam(req, 'id'),
    req.body as UpdateTaskInput,
  );
  sendSuccess(res, { task });
}

export async function deleteTaskHandler(req: Request, res: Response): Promise<void> {
  await taskService.deleteTask(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, { deleted: true });
}

export async function updateTaskStatusHandler(req: Request, res: Response): Promise<void> {
  const task = await taskService.updateTaskStatus(
    requireAuth(req),
    requireParam(req, 'id'),
    req.body as UpdateTaskStatusInput,
  );
  sendSuccess(res, { task });
}

export async function listCommentsHandler(req: Request, res: Response): Promise<void> {
  const comments = await taskService.listComments(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, { comments });
}

export async function createCommentHandler(req: Request, res: Response): Promise<void> {
  const comment = await taskService.createComment(
    requireAuth(req),
    requireParam(req, 'id'),
    req.body as CreateCommentInput,
  );
  sendSuccess(res, { comment }, { status: 201 });
}
