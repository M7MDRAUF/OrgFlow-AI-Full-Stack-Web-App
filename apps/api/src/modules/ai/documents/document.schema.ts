// rag-ingest-agent — Zod schemas for document ingestion endpoints.
import { DOCUMENT_VISIBILITIES, USER_ROLES } from '@orgflow/shared-types';
import { z } from 'zod';

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

// Multipart form fields arrive as strings. `allowedRoles` may come in as a
// single string (comma-separated or repeated single value) or as an array
// (multer auto-arrays repeated fields). Normalise both shapes before the
// strict z.array validation (BE-C-002).
const allowedRolesField = z.preprocess(
  (raw) => {
    if (raw === undefined || raw === null) return undefined;
    if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter((v) => v.length > 0);
    if (typeof raw === 'string') {
      const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return parts.length === 0 ? undefined : parts;
    }
    return raw;
  },
  z.array(z.enum(USER_ROLES)).optional(),
);

export const uploadDocumentSchema = z
  .object({
    title: z.string().min(1).max(200),
    visibility: z.enum(DOCUMENT_VISIBILITIES),
    teamId: z.string().regex(objectIdRegex).optional(),
    projectId: z.string().regex(objectIdRegex).optional(),
    allowedRoles: allowedRolesField,
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
