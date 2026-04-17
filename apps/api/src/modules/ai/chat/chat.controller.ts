// rag-chat-agent — HTTP handlers for the assistant chat endpoint.
import type { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response.js';
import { errors } from '../../../utils/errors.js';
import * as chatService from './chat.service.js';
import type { ChatRequestInput } from './chat.schema.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function askHandler(req: Request, res: Response): Promise<void> {
  const payload = await chatService.askQuestion(requireAuth(req), req.body as ChatRequestInput);
  sendSuccess(res, payload);
}

export async function historyHandler(req: Request, res: Response): Promise<void> {
  const messages = await chatService.getHistory(requireAuth(req));
  sendSuccess(res, { messages });
}
