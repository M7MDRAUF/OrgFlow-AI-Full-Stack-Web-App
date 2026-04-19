import type { Request, Response } from 'express';
import { errors } from '../../utils/errors.js';
import { paginationSchema } from '../../utils/pagination.js';
import { requireParam } from '../../utils/request.js';
import { sendSuccess } from '../../utils/response.js';
import type {
  CreateAnnouncementInput,
  ListAnnouncementsQuery,
  UpdateAnnouncementInput,
} from './announcement.schema.js';
import * as announcementService from './announcement.service.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function listAnnouncementsHandler(req: Request, res: Response): Promise<void> {
  const pagination = paginationSchema.parse(req.query);
  const { items, total } = await announcementService.listAnnouncements(
    requireAuth(req),
    req.query as unknown as ListAnnouncementsQuery,
    pagination,
  );
  sendSuccess(
    res,
    { announcements: items },
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

export async function getAnnouncementHandler(req: Request, res: Response): Promise<void> {
  const announcement = await announcementService.getAnnouncement(
    requireAuth(req),
    requireParam(req, 'id'),
  );
  sendSuccess(res, { announcement });
}

export async function createAnnouncementHandler(req: Request, res: Response): Promise<void> {
  const announcement = await announcementService.createAnnouncement(
    requireAuth(req),
    req.body as CreateAnnouncementInput,
  );
  sendSuccess(res, { announcement }, { status: 201 });
}

export async function updateAnnouncementHandler(req: Request, res: Response): Promise<void> {
  const announcement = await announcementService.updateAnnouncement(
    requireAuth(req),
    requireParam(req, 'id'),
    req.body as UpdateAnnouncementInput,
  );
  sendSuccess(res, { announcement });
}

export async function deleteAnnouncementHandler(req: Request, res: Response): Promise<void> {
  const result = await announcementService.deleteAnnouncement(
    requireAuth(req),
    requireParam(req, 'id'),
  );
  sendSuccess(res, result);
}

export async function markAnnouncementReadHandler(req: Request, res: Response): Promise<void> {
  const announcement = await announcementService.markAnnouncementRead(
    requireAuth(req),
    requireParam(req, 'id'),
  );
  sendSuccess(res, { announcement });
}

export async function getUnreadCountHandler(req: Request, res: Response): Promise<void> {
  const result = await announcementService.getUnreadCount(requireAuth(req));
  sendSuccess(res, result);
}
