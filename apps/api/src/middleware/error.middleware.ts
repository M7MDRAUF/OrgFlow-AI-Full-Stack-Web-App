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

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const env = loadEnv();
  const logger = getLogger(env);

  if (err instanceof ZodError) {
    // H-008: log validation failures at warn level so CI + ops can spot
    // contract drift; include request shape but never the body payload.
    logger.warn(
      { path: req.path, method: req.method, issues: err.issues.length },
      'validation error',
    );
    const appErr = errors.validation(
      'Invalid request',
      err.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message })),
    );
    sendErrorFromApp(res, appErr);
    return;
  }

  // Handle malformed JSON from express.json() — SyntaxError with type 'entity.parse.failed'.
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as SyntaxError & { status: number }).status === 400 &&
    'type' in err &&
    (err as SyntaxError & { type: string }).type === 'entity.parse.failed'
  ) {
    sendError(res, {
      status: 400,
      code: 'INVALID_JSON',
      message: 'Malformed JSON in request body',
    });
    return;
  }

  if (isAppError(err)) {
    // I-007: structured RBAC denial + auth failure logs so ops can spot
    // probing / misconfigured guards. We log at `warn` for 401/403 with a
    // stable event code and a tight payload (no body, no headers beyond
    // method + path + correlationId) so it can be alerted on in aggregate.
    if (err.statusCode === 403 || err.statusCode === 401) {
      logger.warn(
        {
          event: err.statusCode === 403 ? 'rbac.deny' : 'auth.deny',
          path: req.path,
          method: req.method,
          actorUserId: req.auth?.userId ?? null,
          actorRole: req.auth?.role ?? null,
          actorOrgId: req.auth?.organizationId ?? null,
          correlationId: req.correlationId ?? null,
          code: err.code,
        },
        err.message,
      );
    }
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
