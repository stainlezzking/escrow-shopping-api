import { of, lastValueFrom } from 'rxjs';
import { ApiResponseInterceptor } from './api-response.interceptor';
import { apiResponse } from '../responses/api-response';
import { describe, it, expect } from '@jest/globals';

describe('ApiResponseInterceptor', () => {
  const interceptor = new ApiResponseInterceptor();

  it('wraps plain data in the standard response shape', async () => {
    const result = await lastValueFrom(
      interceptor.intercept({} as never, {
        handle: () => of({ value: 'ready' }),
      }),
    );

    expect(result).toEqual({
      success: true,
      data: { value: 'ready' },
      message: 'Operation successful',
    });
  });

  it('preserves helper messages and metadata', async () => {
    const result = await lastValueFrom(
      interceptor.intercept({} as never, {
        handle: () =>
          of(
            apiResponse([{ id: 'one' }], 'Records retrieved successfully', {
              page: 1,
            }),
          ),
      }),
    );

    expect(result).toEqual({
      success: true,
      data: [{ id: 'one' }],
      message: 'Records retrieved successfully',
      meta: { page: 1 },
    });
  });
});
