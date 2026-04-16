// Central error middleware. Normalizes errors into the ApiErrorResponse
// envelope and logs unexpected errors. (platform-agent)
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { loadEnv } from '../app/env.js';
import { getLogger } from '../config/logger.js';
import { errors, isAppError, type AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(errors.notFound(`Route ${req.method} ${req.path} not found`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const env = loadEnv();
  const logger = getLogger(env);

  if (err instanceof ZodError) {
    const appErr = errors.validation(
      'Invalid request',
      err.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message })),
    );
    sendErrorFromApp(res, appErr);
    return;
  }
  if (isAppError(err)) {
    sendErrorFromApp(res, err);
    return;
  }

  logger.error({ err }, 'unhandled error');
  sendError(res, {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
}

function sendErrorFromApp(res: Response, err: AppError): void {
  sendError(res, {
    status: err.statusCode,
    code: err.code,
    message: err.expose ? err.message : 'Internal server error',
    ...(err.details === undefined ? {} : { details: err.details }),
  });
}
