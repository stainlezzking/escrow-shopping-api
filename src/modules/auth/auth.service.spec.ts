/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, WalletOwnerType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PasswordHasherService } from './password-hasher.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const now = new Date('2026-06-19T09:00:00.000Z');
  const userRecord = {
    id: 'user_one',
    email: 'buyer@example.com',
    passwordHash: 'stored_hash',
    role: UserRole.BUYER,
    status: 'ACTIVE',
    phoneNumber: '08012345678',
    createdAt: now,
    updatedAt: now,
    buyerProfile: {
      id: 'buyer_profile_one',
      fullName: 'Ada Buyer',
      phoneNumber: '08012345678',
      status: 'ACTIVE',
      wallet: {
        id: 'wallet_one',
        ownerType: WalletOwnerType.BUYER,
        status: 'ACTIVE',
        availableBalanceKobo: BigInt(0),
        escrowBalanceKobo: BigInt(0),
        pendingPayoutBalanceKobo: BigInt(0),
      },
    },
  };

  let prisma: jest.Mocked<PrismaService>;
  let passwordHasher: jest.Mocked<PasswordHasherService>;
  let jwtService: jest.Mocked<JwtService>;
  let service: AuthService;

  beforeEach(() => {
    const tx = {
      user: {
        create: jest.fn().mockResolvedValue(userRecord),
      },
      buyerProfile: {
        create: jest.fn().mockResolvedValue(userRecord.buyerProfile),
      },
      wallet: {
        create: jest.fn().mockResolvedValue(userRecord.buyerProfile.wallet),
      },
    };

    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(userRecord),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as jest.Mocked<PrismaService>;

    passwordHasher = {
      hash: jest.fn().mockResolvedValue('hashed_password'),
      verify: jest.fn().mockResolvedValue(true),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt_access_token'),
    } as unknown as jest.Mocked<JwtService>;

    service = new AuthService(prisma, passwordHasher, jwtService);
  });

  it('registers a buyer with a hashed password, buyer profile, and buyer wallet', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.register({
      email: 'BUYER@Example.com',
      password: 'StrongPass123',
      fullName: 'Ada Buyer',
      phoneNumber: '08012345678',
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith('StrongPass123');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user_one',
      email: 'buyer@example.com',
      role: UserRole.BUYER,
    });
    expect(result).toEqual({
      accessToken: 'jwt_access_token',
      user: expect.objectContaining({
        id: 'user_one',
        email: 'buyer@example.com',
        role: UserRole.BUYER,
        buyerProfile: expect.objectContaining({
          id: 'buyer_profile_one',
          wallet: expect.objectContaining({ id: 'wallet_one' }),
        }),
      }),
    });
    expect(JSON.stringify(result)).not.toContain('hashed_password');
    expect(JSON.stringify(result)).not.toContain('stored_hash');
  });

  it('rejects duplicate registration emails safely', async () => {
    prisma.user.findUnique.mockResolvedValue(userRecord);

    await expect(
      service.register({
        email: 'buyer@example.com',
        password: 'StrongPass123',
        fullName: 'Ada Buyer',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in an active user and updates last login timestamp', async () => {
    prisma.user.findUnique.mockResolvedValue(userRecord);

    const result = await service.login({
      email: 'buyer@example.com',
      password: 'StrongPass123',
    });

    expect(passwordHasher.verify).toHaveBeenCalledWith(
      'StrongPass123',
      'stored_hash',
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_one' },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(result.accessToken).toBe('jwt_access_token');
    expect(JSON.stringify(result)).not.toContain('stored_hash');
  });

  it('rejects invalid login credentials with a generic error', async () => {
    prisma.user.findUnique.mockResolvedValue(userRecord);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.login({
        email: 'buyer@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
