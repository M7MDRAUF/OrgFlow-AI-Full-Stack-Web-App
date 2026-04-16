// Typed success/error response builders. (platform-agent)
import type { Response } from 'express';
import type {
  ApiErrorCode,
  ApiErrorDetail,
  ApiResponseMeta,
  ApiSuccessResponse,
} from '@orgflow/shared-types';

export function sendSuccess(
  res: Response,
  data: unknown,
  options?: { status?: number; meta?: ApiResponseMeta },
): Response {
  const status = options?.status ?? 200;
  const body: ApiSuccessResponse<unknown> =
    options?.meta === undefined
      ? { success: true, data }
      : { success: true, data, meta: options.meta };
  return res.status(status).json(body);
}

export function sendError(
  res: Response,
  params: { status: number; code: ApiErrorCode; message: string; details?: ApiErrorDetail[] },
): Response {
  return res.status(params.status).json({
    success: false,
    error: {
      code: params.code,
      message: params.message,
      ...(params.details === undefined ? {} : { details: params.details }),
    },
  });
}
