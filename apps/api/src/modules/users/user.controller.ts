import type { Request, Response } from 'express';
import { errors } from '../../utils/errors.js';
import { paginationSchema } from '../../utils/pagination.js';
import { requireParam } from '../../utils/request.js';
import { sendSuccess } from '../../utils/response.js';
import type { ListUsersQuery, UpdateUserInput, UpdateUserStatusInput } from './user.schema.js';
import * as userService from './user.service.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function listUsersHandler(req: Request, res: Response): Promise<void> {
  const auth = requireAuth(req);
  const pagination = paginationSchema.parse(req.query);
  const { items, total } = await userService.listUsers(
    auth,
    req.query as unknown as ListUsersQuery,
    pagination,
  );
  sendSuccess(
    res,
    { users: items },
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

export async function getUserHandler(req: Request, res: Response): Promise<void> {
  const auth = requireAuth(req);
  const user = await userService.getUser(auth, requireParam(req, 'id'));
  sendSuccess(res, { user });
}

export async function updateUserHandler(req: Request, res: Response): Promise<void> {
  const auth = requireAuth(req);
  const user = await userService.updateUser(
    auth,
    requireParam(req, 'id'),
    req.body as UpdateUserInput,
  );
  sendSuccess(res, { user });
}

export async function updateUserStatusHandler(req: Request, res: Response): Promise<void> {
  const auth = requireAuth(req);
  const user = await userService.updateUserStatus(
    auth,
    requireParam(req, 'id'),
    req.body as UpdateUserStatusInput,
  );
  sendSuccess(res, { user });
}
