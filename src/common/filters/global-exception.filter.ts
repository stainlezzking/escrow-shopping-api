import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorPayload {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}

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

  private toPayload(exception: unknown, status: number): ErrorPayload {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null) {
        const responseBody = body as Record<string, unknown>;

        return {
          success: false,
          message: this.safeMessage(responseBody.message),
          error: {
            code: this.safeCode(responseBody.error, status),
            details: responseBody.details,
          },
        };
      }

      return {
        success: false,
        message: exception.message,
        error: {
          code: this.codeFromStatus(status),
        },
      };
    }

    return {
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
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
    if (typeof code === 'string' && code.trim().length > 0) {
      return code
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/\s+/g, '_')
        .toUpperCase();
    }

    return this.codeFromStatus(status);
  }

  private codeFromStatus(status: number): string {
    const reason = HttpStatus[status] as string | undefined;

    return reason ?? 'INTERNAL_SERVER_ERROR';
  }
}
