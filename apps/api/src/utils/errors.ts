// Typed application error + factory helpers. (platform-agent)
import type { ApiErrorCode, ApiErrorDetail } from '@orgflow/shared-types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly details?: ApiErrorDetail[];
  public readonly expose: boolean;

  public constructor(params: {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    expose?: boolean;
  }) {
    super(params.message);
    this.name = 'AppError';
    this.statusCode = params.statusCode;
    this.code = params.code;
    if (params.details !== undefined) this.details = params.details;
    this.expose = params.expose ?? true;
  }
}

export const errors = {
  validation: (message: string, details?: ApiErrorDetail[]): AppError =>
    new AppError(
      details === undefined
        ? { statusCode: 400, code: 'VALIDATION_ERROR', message }
        : { statusCode: 400, code: 'VALIDATION_ERROR', message, details },
    ),
  unauthenticated: (message = 'Authentication required'): AppError =>
    new AppError({ statusCode: 401, code: 'UNAUTHENTICATED', message }),
  forbidden: (message = 'Access denied'): AppError =>
    new AppError({ statusCode: 403, code: 'FORBIDDEN', message }),
  notFound: (message = 'Resource not found'): AppError =>
    new AppError({ statusCode: 404, code: 'RESOURCE_NOT_FOUND', message }),
  conflict: (message: string): AppError =>
    new AppError({ statusCode: 409, code: 'CONFLICT', message }),
  internal: (message = 'Internal server error'): AppError =>
    new AppError({ statusCode: 500, code: 'INTERNAL_ERROR', message, expose: false }),
  aiUpstream: (message: string): AppError =>
    new AppError({ statusCode: 502, code: 'AI_UPSTREAM_ERROR', message }),
  ingestion: (message: string): AppError =>
    new AppError({ statusCode: 422, code: 'INGESTION_FAILED', message }),
};

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
