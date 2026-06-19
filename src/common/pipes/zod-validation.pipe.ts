import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { z } from 'zod';
import { formatZodIssues } from '../utils/zod-error-formatter';

/**
 * Validates incoming request values with a provided Zod schema.
 *
 * When registered globally without a schema, the pipe is intentionally a
 * pass-through foundation. Feature controllers should instantiate it with their
 * body, query, or params schema until schema metadata decorators are introduced.
 */
@Injectable()
export class ZodValidationPipe<
  TSchema extends z.ZodType,
> implements PipeTransform<unknown, unknown> {
  constructor(private readonly schema?: TSchema) {}

  /**
   * Validates and returns parsed request input.
   *
   * @param value - Raw request value from NestJS.
   * @param metadata - Request metadata supplied by NestJS.
   * @returns Parsed data when a schema is provided, otherwise the original value.
   * @throws BadRequestException when validation fails.
   */
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    void metadata;

    if (!this.schema) {
      return value;
    }

    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    throw new BadRequestException({
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: formatZodIssues(result.error.issues),
      },
    });
  }
}
