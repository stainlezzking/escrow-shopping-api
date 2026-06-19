import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  StandardApiErrorResponse,
  createApiErrorResponse,
} from '../responses/api-response';

/**
 * Converts framework, validation, and unexpected errors into safe API errors.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  /**
   * Handles an exception and sends Escrova's standard error response shape.
   *
   * @param exception - The thrown exception or unknown error.
   * @param host - Current request host context.
   * @returns Nothing; writes the HTTP response directly.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json(this.toPayload(exception, status));
  }

  private toPayload(
    exception: unknown,
    status: number,
  ): StandardApiErrorResponse {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null) {
        const responseBody = body as Record<string, unknown>;

        if (this.isStandardErrorResponse(responseBody)) {
          return responseBody;
        }

        return createApiErrorResponse({
          message: this.safeMessage(responseBody.message),
          code: this.safeCode(responseBody.error, status),
          details: this.safeDetails(responseBody),
        });
      }

      return createApiErrorResponse({
        message: exception.message,
        code: this.codeFromStatus(status),
      });
    }

    return createApiErrorResponse({
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  private safeMessage(message: unknown): string {
    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    return 'Request failed';
  }

  private safeCode(code: unknown, status: number): string {
    if (typeof code === 'object' && code !== null && 'code' in code) {
      return this.safeCode(code.code, status);
    }

    if (typeof code === 'string' && code.trim().length > 0) {
      return code
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/\s+/g, '_')
        .toUpperCase();
    }

    return this.codeFromStatus(status);
  }

  private safeDetails(responseBody: Record<string, unknown>): unknown {
    if ('details' in responseBody) {
      return responseBody.details;
    }

    const error = responseBody.error;

    if (typeof error === 'object' && error !== null && 'details' in error) {
      return error.details;
    }

    return undefined;
  }

  private codeFromStatus(status: number): string {
    const reason = HttpStatus[status] as string | undefined;

    return reason ?? 'INTERNAL_SERVER_ERROR';
  }

  private isStandardErrorResponse(
    body: unknown,
  ): body is StandardApiErrorResponse {
    if (typeof body !== 'object' || body === null) {
      return false;
    }

    const candidate = body as Record<string, unknown>;

    return (
      candidate.success === false &&
      typeof candidate.message === 'string' &&
      typeof candidate.error === 'object' &&
      candidate.error !== null &&
      'code' in candidate.error
    );
  }
}
