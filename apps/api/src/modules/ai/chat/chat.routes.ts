// rag-chat-agent — Routes for chat endpoint.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loadEnv } from '../../../app/env.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import { askHandler, healthHandler, historyHandler } from './chat.controller.js';
import { chatHistoryQuerySchema, chatRequestSchema } from './chat.schema.js';

export function createChatRouter(): Router {
  const router = Router();
  router.use(authMiddleware);
  /**
   * @openapi
   * /ai/chat/health:
   *   get:
   *     tags: [AI Chat]
   *     summary: Check Ollama connectivity
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Ollama connection status
   */
  router.get('/health', asyncHandler(healthHandler));
  // F-007: chat endpoint is expensive (LLM call + vector search). Keep a
  // per-user ceiling so a single account cannot saturate the model server.
  const isTest = loadEnv().NODE_ENV === 'test';
  const chatLimiter = rateLimit({
    windowMs: 60_000,
    limit: isTest ? 1_000 : 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  /**
   * @openapi
   * /ai/chat:
   *   post:
   *     tags: [AI Chat]
   *     summary: Send a message to the AI assistant
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [message]
   *             properties:
   *               message: { type: string }
   *               conversationId: { type: string }
   *     responses:
   *       200:
   *         description: AI response with sources
   *       429:
   *         description: Rate limit exceeded
   */
  router.post('/', chatLimiter, validate({ body: chatRequestSchema }), asyncHandler(askHandler));
  /**
   * @openapi
   * /ai/chat/history:
   *   get:
   *     tags: [AI Chat]
   *     summary: Get chat history for the current user
   *     responses:
   *       200:
   *         description: Array of chat messages
   */
  router.get('/history', validate({ query: chatHistoryQuerySchema }), asyncHandler(historyHandler));
  return router;
}
