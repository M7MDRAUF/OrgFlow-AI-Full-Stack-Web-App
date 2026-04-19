// rag-ingest-agent — Routes for document ingestion endpoints.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { loadEnv } from '../../../app/env.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { requireRole } from '../../../middleware/role.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { asyncHandler } from '../../../utils/async-handler.js';
import {
  deleteDocumentHandler,
  getDocumentHandler,
  listDocumentsHandler,
  reindexDocumentHandler,
  uploadDocumentHandler,
} from './document.controller.js';
import { listDocumentsQuerySchema, uploadDocumentSchema } from './document.schema.js';

// Tight rate-limit for document upload — 10 uploads per 15 minutes per IP.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many uploads, please try again later' },
  },
});

export function createDocumentsRouter(): Router {
  const router = Router();
  const env = loadEnv();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  });

  router.use(authMiddleware);

  /**
   * @openapi
   * /ai/documents:
   *   get:
   *     tags: [AI Documents]
   *     summary: List ingested documents
   *     parameters:
   *       - in: query
   *         name: teamId
   *         schema: { type: string }
   *       - in: query
   *         name: projectId
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Array of documents
   */
  router.get(
    '/',
    validate({ query: listDocumentsQuerySchema }),
    asyncHandler(listDocumentsHandler),
  );
  /**
   * @openapi
   * /ai/documents:
   *   post:
   *     tags: [AI Documents]
   *     summary: Upload and ingest a document
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [file]
   *             properties:
   *               file: { type: string, format: binary }
   *               visibility: { type: string }
   *               allowedRoles: { type: string }
   *               teamId: { type: string }
   *               projectId: { type: string }
   *     responses:
   *       201:
   *         description: Document uploaded and queued for ingestion
   *       429:
   *         description: Rate limit exceeded
   */
  // Zod body validation MUST run AFTER multer populates req.body with text
  // form fields (BE-C-002). This guarantees allowedRoles, visibility, and
  // teamId/projectId are validated at the boundary, matching AGENTS.md §3.2.
  router.post(
    '/',
    requireRole('leader'),
    uploadLimiter,
    upload.single('file'),
    validate({ body: uploadDocumentSchema }),
    asyncHandler(uploadDocumentHandler),
  );
  /**
   * @openapi
   * /ai/documents/{id}:
   *   get:
   *     tags: [AI Documents]
   *     summary: Get a single document by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Document details
   *       404:
   *         description: Document not found
   */
  router.get('/:id', asyncHandler(getDocumentHandler));
  /**
   * @openapi
   * /ai/documents/{id}/reindex:
   *   post:
   *     tags: [AI Documents]
   *     summary: Re-index an existing document
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Document re-indexed
   *       404:
   *         description: Document not found
   */
  router.post('/:id/reindex', requireRole('leader'), asyncHandler(reindexDocumentHandler));
  /**
   * @openapi
   * /ai/documents/{id}:
   *   delete:
   *     tags: [AI Documents]
   *     summary: Delete a document and its chunks
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Document deleted
   *       404:
   *         description: Document not found
   */
  router.delete('/:id', requireRole('leader'), asyncHandler(deleteDocumentHandler));
  return router;
}
