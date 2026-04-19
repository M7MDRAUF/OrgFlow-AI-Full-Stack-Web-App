// Auth routes. POST /auth/login, GET /auth/me, POST /auth/invite (admin),
// POST /auth/complete-invite. Owned by auth-agent.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loadEnv } from '../../app/env.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  completeInviteHandler,
  inviteHandler,
  loginHandler,
  logoutHandler,
  meHandler,
} from './auth.controller.js';
import { completeInviteSchema, inviteSchema, loginSchema } from './auth.schema.js';

export function createAuthRouter(): Router {
  const router = Router();

  // F-007: narrow rate-limit for unauthenticated + credential-bearing
  // endpoints to slow down brute-force and token-enumeration attempts.
  const isTest = loadEnv().NODE_ENV === 'test';
  const loginLimiter = rateLimit({
    windowMs: 60_000,
    limit: isTest ? 1_000 : 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  const inviteLimiter = rateLimit({
    windowMs: 60_000,
    limit: isTest ? 1_000 : 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Authenticate user
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *     responses:
   *       200:
   *         description: JWT token
   *       401:
   *         description: Invalid credentials
   */
  router.post('/login', loginLimiter, validate({ body: loginSchema }), asyncHandler(loginHandler));

  /**
   * @openapi
   * /auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Get current user profile
   *     responses:
   *       200:
   *         description: Authenticated user details
   *       401:
   *         description: Not authenticated
   */
  router.get('/me', authMiddleware, asyncHandler(meHandler));

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Logout current session
   *     responses:
   *       200:
   *         description: Logged out
   */
  router.post('/logout', authMiddleware, asyncHandler(logoutHandler));
  router.post(
    '/invite',
    authMiddleware,
    requireRole('admin'),
    validate({ body: inviteSchema }),
    asyncHandler(inviteHandler),
  );
  router.post(
    '/complete-invite',
    inviteLimiter,
    validate({ body: completeInviteSchema }),
    asyncHandler(completeInviteHandler),
  );

  return router;
}
