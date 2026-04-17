// rag-chat-agent — Routes for chat endpoint.
import { Router } from 'express';
import { asyncHandler } from '../../../utils/async-handler.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { askHandler, historyHandler } from './chat.controller.js';
import { chatRequestSchema } from './chat.schema.js';

export function createChatRouter(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.post('/', validate({ body: chatRequestSchema }), asyncHandler(askHandler));
  router.get('/history', asyncHandler(historyHandler));
  return router;
}
