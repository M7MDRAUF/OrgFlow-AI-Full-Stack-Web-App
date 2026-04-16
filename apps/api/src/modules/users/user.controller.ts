import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { errors } from '../../utils/errors.js';
import { requireParam } from '../../utils/request.js';
import * as userService from './user.service.js';
import type { ListUsersQuery, UpdateUserInput, UpdateUserStatusInput } from './user.schema.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function listUsersHandler(req: Request, res: Response): Promise<void> {
  const auth = requireAuth(req);
  const users = await userService.listUsers(auth, req.query as unknown as ListUsersQuery);
  sendSuccess(res, { users });
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
