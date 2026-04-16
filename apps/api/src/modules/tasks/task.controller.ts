import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { errors } from '../../utils/errors.js';
import { requireParam } from '../../utils/request.js';
import * as taskService from './task.service.js';
import type {
  CreateCommentInput,
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from './task.schema.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function listTasksHandler(req: Request, res: Response): Promise<void> {
  const tasks = await taskService.listTasks(
    requireAuth(req),
    req.query as unknown as ListTasksQuery,
  );
  sendSuccess(res, { tasks });
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
