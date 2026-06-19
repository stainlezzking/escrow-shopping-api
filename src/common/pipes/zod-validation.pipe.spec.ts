import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';
import { describe, it, expect } from '@jest/globals';

describe('ZodValidationPipe', () => {
  it('passes values through when no schema is provided', () => {
    const pipe = new ZodValidationPipe();
    const payload = { value: 'unchanged' };

    expect(pipe.transform(payload, { type: 'body' })).toBe(payload);
  });

  it('returns parsed data when validation succeeds', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        page: z.coerce.number().int().min(1),
      }),
    );

    expect(pipe.transform({ page: '2' }, { type: 'query' })).toEqual({
      page: 2,
    });
  });

  it('throws a safe bad request exception when validation fails', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        email: z.string().email(),
      }),
    );

    expect(() =>
      pipe.transform({ email: 'invalid-email' }, { type: 'body' }),
    ).toThrow(BadRequestException);
  });

  it('formats zod validation issues without raw internals or submitted values', () => {
    const pipe = new ZodValidationPipe(
      z.object({
        buyer: z.object({
          email: z.string().email(),
        }),
      }),
    );

    try {
      pipe.transform({ buyer: { email: 'not-an-email' } }, { type: 'body' });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);

      const response = (error as BadRequestException).getResponse();

      expect(response).toEqual({
        message: 'Validation failed',
        error: {
          code: 'VALIDATION_ERROR',
          details: [
            expect.objectContaining({
              path: 'buyer.email',
              message: expect.any(String),
              code: expect.any(String),
            }),
          ],
        },
      });
      expect(JSON.stringify(response)).not.toContain('not-an-email');
    }
  });
});
