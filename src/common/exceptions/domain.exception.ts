import { HttpException, HttpStatus } from '@nestjs/common';
import { createApiErrorResponse } from '../responses/api-response';

export interface DomainExceptionOptions {
  message: string;
  code: string;
  status?: HttpStatus;
  details?: unknown;
}

/**
 * Base exception for safe domain and business-rule failures.
 *
 * Services should throw this when a valid request fails Escrova business rules,
 * such as invalid escrow transitions, ownership violations, or payout rules.
 */
export class DomainException extends HttpException {
  /**
   * Creates a standard API error response for a business-rule failure.
   *
   * @param options - Safe message, machine-readable code, HTTP status, and optional details.
   */
  constructor(options: DomainExceptionOptions) {
    super(
      createApiErrorResponse({
        message: options.message,
        code: options.code,
        details: options.details,
      }),
      options.status ?? HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
