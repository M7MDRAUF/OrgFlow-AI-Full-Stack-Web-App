// rag-ingest-agent — Routes for document ingestion endpoints.
import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../../utils/async-handler.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { validate } from '../../../middleware/validate.middleware.js';
import { loadEnv } from '../../../app/env.js';
import {
  deleteDocumentHandler,
  listDocumentsHandler,
  uploadDocumentHandler,
} from './document.controller.js';
import { listDocumentsQuerySchema } from './document.schema.js';

export function createDocumentsRouter(): Router {
  const router = Router();
  const env = loadEnv();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  });

  router.use(authMiddleware);
  router.get(
    '/',
    validate({ query: listDocumentsQuerySchema }),
    asyncHandler(listDocumentsHandler),
  );
  router.post('/', upload.single('file'), asyncHandler(uploadDocumentHandler));
  router.delete('/:id', asyncHandler(deleteDocumentHandler));
  return router;
}
