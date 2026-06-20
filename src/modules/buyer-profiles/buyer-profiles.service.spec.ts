/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccountStatus, WalletOwnerType, WalletStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BuyerProfilesService } from './buyer-profiles.service';

describe('BuyerProfilesService', () => {
  const now = new Date('2026-06-19T12:00:00.000Z');
  const buyerProfileRecord = {
    id: 'buyer_profile_one',
    userId: 'user_one',
    fullName: 'Ada Buyer',
    phoneNumber: '08012345678',
    status: AccountStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
    wallet: {
      id: 'buyer_wallet_one',
      ownerType: WalletOwnerType.BUYER,
      status: WalletStatus.ACTIVE,
      availableBalanceKobo: BigInt(0),
      escrowBalanceKobo: BigInt(0),
      pendingPayoutBalanceKobo: BigInt(0),
    },
  };
  const addressRecord = {
    id: 'address_one',
    buyerProfileId: 'buyer_profile_one',
    contactName: 'Ada Buyer',
    phoneNumber: '08012345678',
    state: 'Lagos',
    city: 'Ikeja',
    streetAddress: '12 Allen Avenue',
    deliveryNotes: 'Call before delivery',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  };

  let tx: {
    buyerAddress: {
      updateMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let prisma: jest.Mocked<PrismaService>;
  let service: BuyerProfilesService;

  beforeEach(() => {
    tx = {
      buyerAddress: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue(addressRecord),
        update: jest.fn().mockResolvedValue(addressRecord),
      },
    };

    prisma = {
      buyerProfile: {
        findUnique: jest.fn(),
      },
      buyerAddress: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as jest.Mocked<PrismaService>;

    service = new BuyerProfilesService(prisma);
  });

  it('returns the current user buyer profile without wallet balances', async () => {
    prisma.buyerProfile.findUnique.mockResolvedValue(buyerProfileRecord);

    const result = await service.getOwnProfile('user_one');

    expect(prisma.buyerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user_one' },
      include: expect.any(Object),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'buyer_profile_one',
        fullName: 'Ada Buyer',
        wallet: {
          id: 'buyer_wallet_one',
          ownerType: WalletOwnerType.BUYER,
          status: WalletStatus.ACTIVE,
        },
      }),
    );
    expect(JSON.stringify(result)).not.toContain('availableBalanceKobo');
  });

  it('rejects profile lookup when the buyer profile does not exist', async () => {
    prisma.buyerProfile.findUnique.mockResolvedValue(null);

    await expect(service.getOwnProfile('user_one')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('adds the first address as the default address', async () => {
    prisma.buyerProfile.findUnique.mockResolvedValue(buyerProfileRecord);
    prisma.buyerAddress.count.mockResolvedValue(0);

    const result = await service.addAddress('user_one', {
      contactName: 'Ada Buyer',
      phoneNumber: '08012345678',
      state: 'Lagos',
      city: 'Ikeja',
      streetAddress: '12 Allen Avenue',
      deliveryNotes: 'Call before delivery',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.buyerAddress.updateMany).toHaveBeenCalledWith({
      where: { buyerProfileId: 'buyer_profile_one', isDefault: true },
      data: { isDefault: false },
    });
    expect(tx.buyerAddress.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buyerProfileId: 'buyer_profile_one',
        isDefault: true,
      }),
    });
    expect(result.id).toBe('address_one');
  });

  it('adds a non-default address when the buyer already has addresses', async () => {
    prisma.buyerProfile.findUnique.mockResolvedValue(buyerProfileRecord);
    prisma.buyerAddress.count.mockResolvedValue(2);
    prisma.buyerAddress.create.mockResolvedValue({
      ...addressRecord,
      isDefault: false,
    });

    await service.addAddress('user_one', {
      contactName: 'Ada Buyer',
      state: 'Lagos',
      streetAddress: '12 Allen Avenue',
    });

    expect(prisma.buyerAddress.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buyerProfileId: 'buyer_profile_one',
        isDefault: false,
      }),
    });
  });

  it('lists only addresses owned by the current buyer profile', async () => {
    prisma.buyerProfile.findUnique.mockResolvedValue(buyerProfileRecord);
    prisma.buyerAddress.findMany.mockResolvedValue([addressRecord]);

    const result = await service.listOwnAddresses('user_one');

    expect(prisma.buyerAddress.findMany).toHaveBeenCalledWith({
      where: { buyerProfileId: 'buyer_profile_one' },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    expect(result).toHaveLength(1);
  });

  it('updates an address only when it belongs to the current buyer', async () => {
    prisma.buyerProfile.findUnique.mockResolvedValue(buyerProfileRecord);
    prisma.buyerAddress.findUnique.mockResolvedValue(addressRecord);
    prisma.buyerAddress.update.mockResolvedValue({
      ...addressRecord,
      city: 'Lekki',
    });

    const result = await service.updateAddress('user_one', 'address_one', {
      city: 'Lekki',
    });

    expect(prisma.buyerAddress.update).toHaveBeenCalledWith({
      where: { id: 'address_one' },
      data: { city: 'Lekki' },
    });
    expect(result.city).toBe('Lekki');
  });

  it('rejects address updates for another buyer profile', async () => {
    prisma.buyerProfile.findUnique.mockResolvedValue(buyerProfileRecord);
    prisma.buyerAddress.findUnique.mockResolvedValue({
      ...addressRecord,
      buyerProfileId: 'other_buyer_profile',
    });

    await expect(
      service.updateAddress('user_one', 'address_one', { city: 'Lekki' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sets a default address inside a transaction after ownership validation', async () => {
    prisma.buyerProfile.findUnique.mockResolvedValue(buyerProfileRecord);
    prisma.buyerAddress.findUnique.mockResolvedValue({
      ...addressRecord,
      isDefault: false,
    });

    const result = await service.setDefaultAddress('user_one', 'address_one');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.buyerAddress.updateMany).toHaveBeenCalledWith({
      where: { buyerProfileId: 'buyer_profile_one', isDefault: true },
      data: { isDefault: false },
    });
    expect(tx.buyerAddress.update).toHaveBeenCalledWith({
      where: { id: 'address_one' },
      data: { isDefault: true },
    });
    expect(result.isDefault).toBe(true);
  });

  it('rejects missing addresses', async () => {
    prisma.buyerProfile.findUnique.mockResolvedValue(buyerProfileRecord);
    prisma.buyerAddress.findUnique.mockResolvedValue(null);

    await expect(
      service.setDefaultAddress('user_one', 'missing_address'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
