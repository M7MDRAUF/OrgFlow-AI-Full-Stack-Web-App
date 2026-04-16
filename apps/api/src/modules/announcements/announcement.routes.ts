import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createAnnouncementHandler,
  deleteAnnouncementHandler,
  getAnnouncementHandler,
  listAnnouncementsHandler,
  markAnnouncementReadHandler,
  updateAnnouncementHandler,
} from './announcement.controller.js';
import {
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  updateAnnouncementSchema,
} from './announcement.schema.js';

export function createAnnouncementsRouter(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.get(
    '/',
    validate({ query: listAnnouncementsQuerySchema }),
    asyncHandler(listAnnouncementsHandler),
  );
  router.get('/:id', asyncHandler(getAnnouncementHandler));
  router.post(
    '/',
    validate({ body: createAnnouncementSchema }),
    asyncHandler(createAnnouncementHandler),
  );
  router.patch(
    '/:id',
    validate({ body: updateAnnouncementSchema }),
    asyncHandler(updateAnnouncementHandler),
  );
  router.delete('/:id', asyncHandler(deleteAnnouncementHandler));
  router.post('/:id/read', asyncHandler(markAnnouncementReadHandler));
  return router;
}
