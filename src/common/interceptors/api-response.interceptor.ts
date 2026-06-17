import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import {
  ApiResponseOptions,
  StandardApiResponse,
  createApiResponse,
} from '../responses/api-response';

/**
 * Wraps successful controller results in Escrova's standard API response shape.
 */
@Injectable()
export class ApiResponseInterceptor<TData> implements NestInterceptor<
  TData,
  StandardApiResponse<unknown>
> {
  /**
   * Intercepts successful HTTP responses and applies the shared response format.
   *
   * @param _context - Current request execution context.
   * @param next - Downstream route handler.
   * @returns An observable containing the standardized API response.
   */
  intercept(
    _context: ExecutionContext,
    next: CallHandler<TData>,
  ): Observable<StandardApiResponse<unknown>> {
    return next.handle().pipe(
      map((body: TData) => {
        if (isStandardApiResponse(body)) {
          return body;
        }

        if (isApiResponseOptions<TData>(body)) {
          return createApiResponse({
            data: body.data ?? null,
            message: body.message,
            meta: body.meta,
          });
        }

        return createApiResponse({
          data: body ?? null,
          message: Array.isArray(body)
            ? 'Records retrieved successfully'
            : 'Operation successful',
        });
      }),
    );
  }
}

function isStandardApiResponse(
  body: unknown,
): body is StandardApiResponse<unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    body.success === true
  );
}

function isApiResponseOptions<TData>(
  body: unknown,
): body is ApiResponseOptions<TData> {
  return typeof body === 'object' && body !== null && 'data' in body;
}
