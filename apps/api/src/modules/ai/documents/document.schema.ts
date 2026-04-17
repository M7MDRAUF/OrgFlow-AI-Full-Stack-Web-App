// rag-ingest-agent — Zod schemas for document ingestion endpoints.
import { z } from 'zod';
import { DOCUMENT_VISIBILITIES, USER_ROLES } from '@orgflow/shared-types';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

export const uploadDocumentSchema = z
  .object({
    title: z.string().min(1).max(200),
    visibility: z.enum(DOCUMENT_VISIBILITIES),
    teamId: z.string().regex(objectIdRegex).optional(),
    projectId: z.string().regex(objectIdRegex).optional(),
    allowedRoles: z.array(z.enum(USER_ROLES)).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.visibility === 'team' && val.teamId === undefined) {
      ctx.addIssue({ code: 'custom', path: ['teamId'], message: 'teamId required for team docs' });
    }
    if (val.visibility === 'project' && val.projectId === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['projectId'],
        message: 'projectId required for project docs',
      });
    }
  });

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

export const listDocumentsQuerySchema = z.object({
  visibility: z.enum(DOCUMENT_VISIBILITIES).optional(),
  teamId: z.string().regex(objectIdRegex).optional(),
  projectId: z.string().regex(objectIdRegex).optional(),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
