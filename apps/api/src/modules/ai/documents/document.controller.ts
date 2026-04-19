// rag-ingest-agent — HTTP handlers for document ingestion.
import type { Request, Response } from 'express';
import { errors } from '../../../utils/errors.js';
import { paginationSchema } from '../../../utils/pagination.js';
import { requireParam } from '../../../utils/request.js';
import { sendSuccess } from '../../../utils/response.js';
import type { ListDocumentsQuery, UploadDocumentInput } from './document.schema.js';
import * as documentService from './document.service.js';

function requireAuth(req: Request) {
  if (!req.auth) throw errors.unauthenticated();
  return req.auth;
}

export async function uploadDocumentHandler(req: Request, res: Response): Promise<void> {
  const auth = requireAuth(req);
  const file = req.file;
  if (file === undefined) throw errors.validation('File is required (field: file)');

  // `req.body` is Zod-validated by `validate({ body: uploadDocumentSchema })`
  // mounted on the route AFTER multer. If the caller omitted `title` we fall
  // back to the filename stem (BE-C-002).
  const parsed = req.body as UploadDocumentInput;
  const fallbackTitle = file.originalname.replace(/\.[^.]+$/, '') || file.originalname;
  const input: UploadDocumentInput = {
    ...parsed,
    title: parsed.title.length > 0 ? parsed.title : fallbackTitle,
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
  const pagination = paginationSchema.parse(req.query);
  const { items, total } = await documentService.listDocuments(
    requireAuth(req),
    req.query as unknown as ListDocumentsQuery,
    pagination,
  );
  sendSuccess(
    res,
    { documents: items },
    {
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        hasMore: pagination.page * pagination.pageSize < total,
      },
    },
  );
}

export async function getDocumentHandler(req: Request, res: Response): Promise<void> {
  const document = await documentService.getDocument(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, { document });
}

export async function deleteDocumentHandler(req: Request, res: Response): Promise<void> {
  const result = await documentService.deleteDocument(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, result);
}

export async function reindexDocumentHandler(req: Request, res: Response): Promise<void> {
  const document = await documentService.reindexDocument(requireAuth(req), requireParam(req, 'id'));
  sendSuccess(res, { document });
}
