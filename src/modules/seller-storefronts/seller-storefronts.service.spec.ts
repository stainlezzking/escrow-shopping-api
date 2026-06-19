/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  KycStatus,
  StoreStatus,
  UserRole,
  WalletOwnerType,
  WalletStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SellerStorefrontsService } from './seller-storefronts.service';

describe('SellerStorefrontsService', () => {
  const now = new Date('2026-06-19T12:00:00.000Z');
  const sellerProfileRecord = {
    id: 'store_one',
    userId: 'user_one',
    businessCategoryId: 'business_category_one',
    username: 'tech-haven',
    businessName: 'Tech Haven',
    storeHandle: 'tech-haven',
    storeUrl: 'https://escrova.test/stores/tech-haven',
    baseLocation: 'Lagos',
    bankName: 'Access Bank',
    accountNumber: '0123456789',
    accountName: 'Ada Buyer',
    kycStatus: KycStatus.NOT_SUBMITTED,
    status: StoreStatus.PENDING_KYC,
    createdAt: now,
    updatedAt: now,
    wallet: {
      id: 'seller_wallet_one',
      ownerType: WalletOwnerType.SELLER,
      status: WalletStatus.ACTIVE,
      availableBalanceKobo: BigInt(0),
      escrowBalanceKobo: BigInt(0),
      pendingPayoutBalanceKobo: BigInt(0),
    },
  };

  let prisma: jest.Mocked<PrismaService>;
  let service: SellerStorefrontsService;

  beforeEach(() => {
    const tx = {
      sellerProfile: {
        create: jest.fn().mockResolvedValue({
          ...sellerProfileRecord,
          wallet: null,
        }),
      },
      wallet: {
        create: jest.fn().mockResolvedValue(sellerProfileRecord.wallet),
      },
      user: {
        update: jest.fn().mockResolvedValue({
          id: 'user_one',
          role: UserRole.SELLER,
        }),
      },
    };

    prisma = {
      sellerProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as jest.Mocked<PrismaService>;

    service = new SellerStorefrontsService(prisma);
  });

  it('creates a storefront with a unique handle and seller wallet', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue(null);

    const result = await service.createStorefront('user_one', {
      businessName: 'Tech Haven',
      storeHandle: 'Tech-Haven',
      businessCategoryId: 'business_category_one',
      baseLocation: 'Lagos',
      bankName: 'Access Bank',
      accountNumber: '0123456789',
      accountName: 'Ada Buyer',
    });

    expect(prisma.sellerProfile.findUnique).toHaveBeenCalledWith({
      where: { storeHandle: 'tech-haven' },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        id: 'store_one',
        storeHandle: 'tech-haven',
        bankDetails: {
          bankName: 'Access Bank',
          accountName: 'Ada Buyer',
          accountNumberLast4: '6789',
        },
        wallet: expect.objectContaining({
          id: 'seller_wallet_one',
          ownerType: WalletOwnerType.SELLER,
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain('0123456789');
  });

  it('rejects duplicate store handles', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue(sellerProfileRecord);

    await expect(
      service.createStorefront('user_one', {
        businessName: 'Tech Haven',
        storeHandle: 'tech-haven',
        bankName: 'Access Bank',
        accountNumber: '0123456789',
        accountName: 'Ada Buyer',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists only stores owned by the current user', async () => {
    prisma.sellerProfile.findMany.mockResolvedValue([sellerProfileRecord]);

    const result = await service.listOwnedStorefronts('user_one');

    expect(prisma.sellerProfile.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_one' },
      include: expect.any(Object),
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('0123456789');
  });

  it('returns active store context only for the owner', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue(sellerProfileRecord);

    const result = await service.getActiveStoreContext('user_one', 'store_one');

    expect(prisma.sellerProfile.findUnique).toHaveBeenCalledWith({
      where: { id: 'store_one' },
      include: expect.any(Object),
    });
    expect(result.id).toBe('store_one');
  });

  it('rejects active store context access for another user', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue({
      ...sellerProfileRecord,
      userId: 'other_user',
    });

    await expect(
      service.getActiveStoreContext('user_one', 'store_one'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing active store context', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue(null);

    await expect(
      service.getActiveStoreContext('user_one', 'missing_store'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
