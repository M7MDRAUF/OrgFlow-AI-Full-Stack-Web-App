import type { Request, Response } from 'express';
import { errors } from '../../utils/errors.js';
import { paginationSchema } from '../../utils/pagination.js';
import { requireParam } from '../../utils/request.js';
import { sendSuccess } from '../../utils/response.js';
import type { CreateTeamInput, UpdateTeamInput } from './team.schema.js';
import * as teamService from './team.service.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function listTeamsHandler(req: Request, res: Response): Promise<void> {
  const pagination = paginationSchema.parse(req.query);
  const { items, total } = await teamService.listTeams(requireAuth(req), pagination);
  sendSuccess(
    res,
    { teams: items },
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
