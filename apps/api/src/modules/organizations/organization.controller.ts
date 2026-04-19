import type { Request, Response } from 'express';
import { errors } from '../../utils/errors.js';
import { sendSuccess } from '../../utils/response.js';
import type { UpdateOrganizationInput } from './organization.schema.js';
import * as organizationService from './organization.service.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function getCurrentOrganizationHandler(req: Request, res: Response): Promise<void> {
  const organization = await organizationService.getCurrentOrganization(requireAuth(req));
  sendSuccess(res, { organization });
}

export async function updateCurrentOrganizationHandler(req: Request, res: Response): Promise<void> {
  const organization = await organizationService.updateCurrentOrganization(
    requireAuth(req),
    req.body as UpdateOrganizationInput,
  );
  sendSuccess(res, { organization });
}
