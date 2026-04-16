// Canonical API envelope (OrgFlow_AI_Master_Spec §3.9).
export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  meta?: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

export interface ApiResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  hasMore?: boolean;
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'RESOURCE_NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'AI_UPSTREAM_ERROR',
  'INGESTION_FAILED',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}
