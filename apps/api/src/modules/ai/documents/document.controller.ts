// rag-ingest-agent — HTTP handlers for document ingestion.
import type { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response.js';
import { errors } from '../../../utils/errors.js';
import { requireParam } from '../../../utils/request.js';
import * as documentService from './document.service.js';
import type { ListDocumentsQuery, UploadDocumentInput } from './document.schema.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

function parseAllowedRoles(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.length > 0) return raw.split(',').map((s) => s.trim());
  return undefined;
}

export async function uploadDocumentHandler(req: Request, res: Response): Promise<void> {
  const auth = requireAuth(req);
  const file = req.file;
  if (file === undefined) throw errors.validation('File is required (field: file)');

  const body = req.body as Record<string, unknown>;
  const input: UploadDocumentInput = {
    title: typeof body['title'] === 'string' ? body['title'] : '',
    visibility:
      body['visibility'] === 'organization' ||
      body['visibility'] === 'team' ||
      body['visibility'] === 'project'
        ? body['visibility']
        : 'organization',
    ...(typeof body['teamId'] === 'string' ? { teamId: body['teamId'] } : {}),
    ...(typeof body['projectId'] === 'string' ? { projectId: body['projectId'] } : {}),
    ...(() => {
      const roles = parseAllowedRoles(body['allowedRoles']);
      return roles === undefined
        ? {}
        : { allowedRoles: roles as UploadDocumentInput['allowedRoles'] };
    })(),
  };

  const document = await documentService.uploadDocument(auth, input, {
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });
  sendSuccess(res, { document }, { status: 201 });
}

export async function listDocumentsHandler(req: Request, res: Response): Promise<void> {
  const documents = await documentService.listDocuments(
    requireAuth(req),
    req.query as unknown as ListDocumentsQuery,
  );
  sendSuccess(res, { documents });
}

export async function deleteDocumentHandler(req: Request, res: Response): Promise<void> {
  const result = await documentService.deleteDocument(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, result);
}
