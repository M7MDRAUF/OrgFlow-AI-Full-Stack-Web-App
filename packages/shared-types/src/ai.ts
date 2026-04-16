import type { UserRole } from './roles.js';

export const DOCUMENT_VISIBILITIES = ['organization', 'team', 'project'] as const;
export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];

export const DOCUMENT_STATUSES = ['uploaded', 'parsed', 'indexed', 'failed'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface DocumentResponseDto {
  id: string;
  organizationId: string;
  teamId: string | null;
  projectId: string | null;
  visibility: DocumentVisibility;
  title: string;
  originalFilename: string;
  mimeType: string;
  uploadedBy: string;
  status: DocumentStatus;
  allowedRoles: UserRole[];
  chunkCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiSourceCitation {
  documentId: string;
  title: string;
  chunkIndex: number;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: AiSourceCitation[];
  createdAt: string;
}

export interface ChatAnswerPayload {
  answer: string;
  sources: AiSourceCitation[];
  durationMs: number;
}

export interface ChatRequestDto {
  question: string;
  teamId?: string;
  projectId?: string;
}
