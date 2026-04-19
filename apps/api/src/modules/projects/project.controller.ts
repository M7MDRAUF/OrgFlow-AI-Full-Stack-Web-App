import type { Request, Response } from 'express';
import { errors } from '../../utils/errors.js';
import { paginationSchema } from '../../utils/pagination.js';
import { requireParam } from '../../utils/request.js';
import { sendSuccess } from '../../utils/response.js';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from './project.schema.js';
import * as projectService from './project.service.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function listProjectsHandler(req: Request, res: Response): Promise<void> {
  const pagination = paginationSchema.parse(req.query);
  const { items, total } = await projectService.listProjects(
    requireAuth(req),
    req.query as unknown as ListProjectsQuery,
    pagination,
  );
  sendSuccess(
    res,
    { projects: items },
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

export async function getProjectHandler(req: Request, res: Response): Promise<void> {
  const project = await projectService.getProject(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, { project });
}

export async function createProjectHandler(req: Request, res: Response): Promise<void> {
  const project = await projectService.createProject(
    requireAuth(req),
    req.body as CreateProjectInput,
  );
  sendSuccess(res, { project }, { status: 201 });
}

export async function updateProjectHandler(req: Request, res: Response): Promise<void> {
  const project = await projectService.updateProject(
    requireAuth(req),
    requireParam(req, 'id'),
    req.body as UpdateProjectInput,
  );
  sendSuccess(res, { project });
}

export async function deleteProjectHandler(req: Request, res: Response): Promise<void> {
  await projectService.deleteProject(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, { deleted: true });
}
