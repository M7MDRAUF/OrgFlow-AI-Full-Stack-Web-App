import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { errors } from '../../utils/errors.js';
import { requireParam } from '../../utils/request.js';
import * as teamService from './team.service.js';
import type { CreateTeamInput, UpdateTeamInput } from './team.schema.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function listTeamsHandler(req: Request, res: Response): Promise<void> {
  const teams = await teamService.listTeams(requireAuth(req));
  sendSuccess(res, { teams });
}

export async function getTeamHandler(req: Request, res: Response): Promise<void> {
  const team = await teamService.getTeam(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, { team });
}

export async function createTeamHandler(req: Request, res: Response): Promise<void> {
  const team = await teamService.createTeam(requireAuth(req), req.body as CreateTeamInput);
  sendSuccess(res, { team }, { status: 201 });
}

export async function updateTeamHandler(req: Request, res: Response): Promise<void> {
  const team = await teamService.updateTeam(
    requireAuth(req),
    requireParam(req, 'id'),
    req.body as UpdateTeamInput,
  );
  sendSuccess(res, { team });
}

export async function deleteTeamHandler(req: Request, res: Response): Promise<void> {
  await teamService.deleteTeam(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, { deleted: true });
}
