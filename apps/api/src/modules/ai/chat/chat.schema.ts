// rag-chat-agent — Zod schema for chat endpoint.
import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

export const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  teamId: z.string().regex(objectIdRegex).optional(),
  projectId: z.string().regex(objectIdRegex).optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

// BUG-002: Validate chat history query params at the boundary.
export const chatHistoryQuerySchema = z.object({
  cursor: z.string().regex(objectIdRegex).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type ChatHistoryQuery = z.infer<typeof chatHistoryQuerySchema>;
