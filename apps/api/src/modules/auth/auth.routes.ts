// Auth routes. POST /auth/login, GET /auth/me, POST /auth/invite (admin),
// POST /auth/complete-invite. Owned by auth-agent.
import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import {
  completeInviteHandler,
  inviteHandler,
  loginHandler,
  meHandler,
} from './auth.controller.js';
import { completeInviteSchema, inviteSchema, loginSchema } from './auth.schema.js';

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/login', validate({ body: loginSchema }), asyncHandler(loginHandler));
  router.get('/me', authMiddleware, asyncHandler(meHandler));
  router.post(
    '/invite',
    authMiddleware,
    requireRole('admin'),
    validate({ body: inviteSchema }),
    asyncHandler(inviteHandler),
  );
  router.post(
    '/complete-invite',
    validate({ body: completeInviteSchema }),
    asyncHandler(completeInviteHandler),
  );

  return router;
}
