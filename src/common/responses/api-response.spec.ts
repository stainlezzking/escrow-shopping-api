import {
  createApiErrorResponse,
  createApiResponse,
  createPaginationMeta,
  paginatedResponse,
} from './api-response';

describe('api response helpers', () => {
  it('builds the standard success response envelope', () => {
    expect(
      createApiResponse({
        data: { id: 'one' },
        message: 'Created',
      }),
    ).toEqual({
      success: true,
      data: { id: 'one' },
      message: 'Created',
    });
  });

  it('normalizes pagination metadata safely', () => {
    expect(createPaginationMeta(0, 0, -5)).toEqual({
      page: 1,
      limit: 1,
      total: 0,
      totalPages: 1,
    });

    expect(createPaginationMeta(2, 20, 41)).toEqual({
      page: 2,
      limit: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it('builds paginated response payloads for the interceptor', () => {
    expect(
      paginatedResponse([{ id: 'one' }], {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      }),
    ).toEqual({
      data: [{ id: 'one' }],
      message: 'Records retrieved successfully',
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('builds the standard error response envelope', () => {
    expect(
      createApiErrorResponse({
        message: 'Cannot release disputed escrow',
        code: 'ESCROW_DISPUTED',
        details: { escrowId: 'escrow_one' },
      }),
    ).toEqual({
      success: false,
      message: 'Cannot release disputed escrow',
      error: {
        code: 'ESCROW_DISPUTED',
        details: { escrowId: 'escrow_one' },
      },
    });
  });
});
