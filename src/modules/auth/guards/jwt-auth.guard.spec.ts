import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('rejects requests without bearer tokens', async () => {
    const guard = new JwtAuthGuard({} as JwtService);

    await expect(
      guard.canActivate(createContext(undefined)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verifies bearer tokens and attaches the authenticated user', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user_one',
        email: 'buyer@example.com',
        role: 'BUYER',
      }),
    } as unknown as jest.Mocked<JwtService>;
    const request = { headers: { authorization: 'Bearer token' } };
    const guard = new JwtAuthGuard(jwtService);

    await expect(
      guard.canActivate(createContextFromRequest(request)),
    ).resolves.toBe(true);
    expect(request).toEqual({
      headers: { authorization: 'Bearer token' },
      user: {
        sub: 'user_one',
        email: 'buyer@example.com',
        role: 'BUYER',
      },
    });
  });
});

function createContext(authorization: string | undefined): ExecutionContext {
  return createContextFromRequest({
    headers: authorization ? { authorization } : {},
  });
}

function createContextFromRequest(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
