import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { describe, it, expect, jest } from '@jest/globals';
import { DomainException } from '../exceptions/domain.exception';

describe('GlobalExceptionFilter', () => {
  it('formats HttpException responses safely', () => {
    const filter = new GlobalExceptionFilter();
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    filter.catch(
      new BadRequestException({
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        details: [{ path: 'email', message: 'Invalid email' }],
      }),
      createHost(status, json),
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: [{ path: 'email', message: 'Invalid email' }],
      },
    });
  });

  it('preserves standard domain exception responses', () => {
    const filter = new GlobalExceptionFilter();
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    filter.catch(
      new DomainException({
        status: HttpStatus.CONFLICT,
        message: 'This escrow cannot be released while disputed',
        code: 'ESCROW_UNDER_DISPUTE',
        details: { escrowId: 'escrow_one' },
      }),
      createHost(status, json),
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'This escrow cannot be released while disputed',
      error: {
        code: 'ESCROW_UNDER_DISPUTE',
        details: { escrowId: 'escrow_one' },
      },
    });
  });

  it('keeps nested validation error details from bad requests', () => {
    const filter = new GlobalExceptionFilter();
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    filter.catch(
      new BadRequestException({
        message: 'Validation failed',
        error: {
          code: 'VALIDATION_ERROR',
          details: [
            {
              path: 'email',
              message: 'Invalid email address',
              code: 'invalid_format',
            },
          ],
        },
      }),
      createHost(status, json),
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: [
          {
            path: 'email',
            message: 'Invalid email address',
            code: 'invalid_format',
          },
        ],
      },
    });
  });

  it('hides unexpected error details', () => {
    const filter = new GlobalExceptionFilter();
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    filter.catch(
      new Error('database password leaked'),
      createHost(status, json),
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'An unexpected error occurred',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  });
});

function createHost(status: jest.Mock, json: jest.Mock): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status, json }),
    }),
  } as ArgumentsHost;
}
