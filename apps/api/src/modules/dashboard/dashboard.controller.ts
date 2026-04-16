import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { errors } from '../../utils/errors.js';
import { getDashboard } from './dashboard.service.js';

export async function getDashboardHandler(req: Request, res: Response): Promise<void> {
  if (!req.auth) throw errors.unauthenticated();
  const dashboard = await getDashboard(req.auth);
  sendSuccess(res, { dashboard });
}
