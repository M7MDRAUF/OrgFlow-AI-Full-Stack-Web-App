// Auth controllers — thin, validated inputs, delegates to service.
import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { errors } from '../../utils/errors.js';
import * as authService from './auth.service.js';
import type { CompleteInviteInput, InviteInput, LoginInput } from './auth.schema.js';

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput;
  const result = await authService.login(input);
  sendSuccess(res, result);
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw errors.unauthenticated();
  }
  const result = await authService.getCurrentUser(req.auth.userId);
  sendSuccess(res, result);
}

export async function inviteHandler(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    throw errors.unauthenticated();
  }
  const input = req.body as InviteInput;
  const result = await authService.inviteUser(req.auth.organizationId, input);
  sendSuccess(res, result, { status: 201 });
}

export async function completeInviteHandler(req: Request, res: Response): Promise<void> {
  const input = req.body as CompleteInviteInput;
  const result = await authService.completeInvite(input);
  sendSuccess(res, result);
}
