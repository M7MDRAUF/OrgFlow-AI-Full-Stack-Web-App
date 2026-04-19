import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  createAnnouncementHandler,
  deleteAnnouncementHandler,
  getAnnouncementHandler,
  getUnreadCountHandler,
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

  /**
   * @openapi
   * /announcements:
   *   get:
   *     tags: [Announcements]
   *     summary: List announcements
   *     parameters:
   *       - in: query
   *         name: target
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Array of announcements
   */
  router.get(
    '/',
    validate({ query: listAnnouncementsQuerySchema }),
    asyncHandler(listAnnouncementsHandler),
  );
  /**
   * @openapi
   * /announcements/unread-count:
   *   get:
   *     tags: [Announcements]
   *     summary: Get unread announcements count for current user
   *     responses:
   *       200:
   *         description: Unread count
   */
  router.get('/unread-count', asyncHandler(getUnreadCountHandler));
  /**
   * @openapi
   * /announcements/{id}:
   *   get:
   *     tags: [Announcements]
   *     summary: Get a single announcement by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Announcement details
   *       404:
   *         description: Announcement not found
   */
  router.get('/:id', asyncHandler(getAnnouncementHandler));
  /**
   * @openapi
   * /announcements:
   *   post:
   *     tags: [Announcements]
   *     summary: Create a new announcement
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [title, content]
   *             properties:
   *               title: { type: string }
   *               content: { type: string }
   *               target: { type: string, enum: [organization, team] }
   *               teamId: { type: string }
   *     responses:
   *       201:
   *         description: Created announcement
   */
  router.post(
    '/',
    validate({ body: createAnnouncementSchema }),
    asyncHandler(createAnnouncementHandler),
  );
  /**
   * @openapi
   * /announcements/{id}:
   *   patch:
   *     tags: [Announcements]
   *     summary: Update an announcement
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title: { type: string }
   *               content: { type: string }
   *     responses:
   *       200:
   *         description: Updated announcement
   *       404:
   *         description: Announcement not found
   */
  router.patch(
    '/:id',
    validate({ body: updateAnnouncementSchema }),
    asyncHandler(updateAnnouncementHandler),
  );
  /**
   * @openapi
   * /announcements/{id}:
   *   delete:
   *     tags: [Announcements]
   *     summary: Delete an announcement
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Announcement deleted
   *       404:
   *         description: Announcement not found
   */
  router.delete('/:id', asyncHandler(deleteAnnouncementHandler));
  /**
   * @openapi
   * /announcements/{id}/read:
   *   post:
   *     tags: [Announcements]
   *     summary: Mark an announcement as read
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Announcement marked as read
   *       404:
   *         description: Announcement not found
   */
  router.post('/:id/read', asyncHandler(markAnnouncementReadHandler));
  return router;
}
