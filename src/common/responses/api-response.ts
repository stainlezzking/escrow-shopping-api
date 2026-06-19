export interface ApiResponseOptions<TData> {
  data: TData;
  message?: string;
  meta?: ApiResponseMeta;
}

export type ApiResponseMeta = Record<string, unknown>;

export interface StandardApiResponse<TData> {
  success: true;
  data: TData;
  message: string;
  meta?: ApiResponseMeta;
}

export interface PaginationMeta extends ApiResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorResponseOptions {
  message: string;
  code: string;
  details?: unknown;
}

export interface StandardApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}

/**
 * Builds the standard successful API response envelope used across Escrova.
 *
 * @param options - Response payload, message, and optional list metadata.
 * @returns A successful response envelope.
 */
export function createApiResponse<TData>(
  options: ApiResponseOptions<TData>,
): StandardApiResponse<TData> {
  const response: StandardApiResponse<TData> = {
    success: true,
    data: options.data,
    message: options.message ?? 'Operation successful',
  };

  if (options.meta) {
    response.meta = options.meta;
  }

  return response;
}

/**
 * Creates a controller-friendly payload that the response interceptor will wrap.
 *
 * @param data - Public response data.
 * @param message - Human-readable success message.
 * @param meta - Optional pagination or list metadata.
 * @returns A payload ready for the global response interceptor.
 */
export function apiResponse<TData>(
  data: TData,
  message?: string,
  meta?: ApiResponseMeta,
): ApiResponseOptions<TData> {
  return { data, message, meta };
}

/**
 * Builds pagination metadata for list endpoints.
 *
 * @param page - Current 1-based page number.
 * @param limit - Maximum records requested per page.
 * @param total - Total records matching the query.
 * @returns Standard pagination metadata.
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const safeLimit = Math.max(1, limit);

  return {
    page: Math.max(1, page),
    limit: safeLimit,
    total: Math.max(0, total),
    totalPages: Math.max(1, Math.ceil(Math.max(0, total) / safeLimit)),
  };
}

/**
 * Creates a list response payload with standard pagination metadata.
 *
 * @param data - List items for the current page.
 * @param meta - Standard pagination metadata.
 * @param message - Human-readable success message.
 * @returns A payload ready for the global response interceptor.
 */
export function paginatedResponse<TData>(
  data: TData[],
  meta: PaginationMeta,
  message = 'Records retrieved successfully',
): ApiResponseOptions<TData[]> {
  return apiResponse(data, message, meta);
}

/**
 * Builds the standard API error response envelope used across Escrova.
 *
 * @param options - Safe error message, machine-readable code, and optional details.
 * @returns A client-safe error response envelope.
 */
export function createApiErrorResponse(
  options: ApiErrorResponseOptions,
): StandardApiErrorResponse {
  const response: StandardApiErrorResponse = {
    success: false,
    message: options.message,
    error: {
      code: options.code,
    },
  };

  if (options.details !== undefined) {
    response.error.details = options.details;
  }

  return response;
}
