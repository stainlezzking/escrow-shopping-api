export interface ApiResponseOptions<TData> {
  data: TData;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface StandardApiResponse<TData> {
  success: true;
  data: TData;
  message: string;
  meta?: Record<string, unknown>;
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
  meta?: Record<string, unknown>,
): ApiResponseOptions<TData> {
  return { data, message, meta };
}
