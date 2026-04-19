// rag-chat-agent — HTTP handlers for the assistant chat endpoint.
import type { Request, Response } from 'express';
import { errors } from '../../../utils/errors.js';
import { sendSuccess } from '../../../utils/response.js';
import type { ChatHistoryQuery, ChatRequestInput } from './chat.schema.js';
import * as chatService from './chat.service.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function askHandler(req: Request, res: Response): Promise<void> {
  const payload = await chatService.askQuestion(requireAuth(req), req.body as ChatRequestInput);
  sendSuccess(res, payload);
}

export async function historyHandler(req: Request, res: Response): Promise<void> {
  const { cursor, limit } = req.query as unknown as ChatHistoryQuery;
  const result = await chatService.getHistory(requireAuth(req), cursor, limit);
  sendSuccess(res, result);
}

export async function healthHandler(_req: Request, res: Response): Promise<void> {
  const result = await chatService.checkOllamaHealth();
  sendSuccess(res, result);
}
