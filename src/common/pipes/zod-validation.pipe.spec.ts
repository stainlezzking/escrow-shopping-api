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
});
