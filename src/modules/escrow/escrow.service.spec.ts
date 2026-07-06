/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */

import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  EscrowStatus,
  LedgerDirection,
  LedgerEntryType,
  OrderItemStatus,
  OrderStatus,
  WalletOwnerType,
  WalletStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EscrowService } from './escrow.service';

describe('EscrowService', () => {
  const platformWallet = {
    id: 'platform_wallet_one',
    ownerType: WalletOwnerType.PLATFORM,
    buyerProfileId: null,
    sellerProfileId: null,
    platformEntityId: 'platform_entity_one',
    availableBalanceKobo: BigInt(5000),
    escrowBalanceKobo: BigInt(50000),
    pendingPayoutBalanceKobo: BigInt(0),
    payoutPinHash: null,
    status: WalletStatus.ACTIVE,
    createdAt: new Date('2026-07-03T08:00:00.000Z'),
    updatedAt: new Date('2026-07-03T08:00:00.000Z'),
  };
  const sellerWallet = {
    id: 'seller_wallet_one',
    ownerType: WalletOwnerType.SELLER,
    buyerProfileId: null,
    sellerProfileId: 'store_one',
    platformEntityId: null,
    availableBalanceKobo: BigInt(3000),
    escrowBalanceKobo: BigInt(0),
    pendingPayoutBalanceKobo: BigInt(0),
    payoutPinHash: null,
    status: WalletStatus.ACTIVE,
    createdAt: new Date('2026-07-03T08:00:00.000Z'),
    updatedAt: new Date('2026-07-03T08:00:00.000Z'),
  };
  const escrow = {
    id: 'escrow_one',
    orderItemId: 'order_item_one',
    sellerProfileId: 'store_one',
    buyerProfileId: 'buyer_profile_one',
    paymentId: 'payment_one',
    escrowReference: 'ESC-order_item_one',
    status: EscrowStatus.HELD,
    grossAmountKobo: BigInt(21000),
    sellerNetAmountKobo: BigInt(20000),
    platformFeeKobo: BigInt(1000),
    shippingFeeKobo: BigInt(0),
    heldAt: new Date('2026-07-03T09:02:00.000Z'),
    disputedAt: null,
    releasedAt: null,
    refundedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-07-03T09:02:00.000Z'),
    updatedAt: new Date('2026-07-03T09:02:00.000Z'),
  };
  const orderItem = {
    id: 'order_item_one',
    orderId: 'order_one',
    sellerProfileId: 'store_one',
    status: OrderItemStatus.DISPATCHED,
    confirmedAt: null,
    releasedAt: null,
    escrow,
    sellerProfile: {
      id: 'store_one',
      wallet: sellerWallet,
    },
    disputes: [],
  };

  let tx: {
    orderItem: {
      findUnique: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    escrowTransaction: { update: jest.Mock };
    wallet: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    walletLedgerEntry: { findUnique: jest.Mock; create: jest.Mock };
    order: { update: jest.Mock };
  };
  let prisma: jest.Mocked<PrismaService>;
  let service: EscrowService;

  beforeEach(() => {
    tx = {
      orderItem: {
        findUnique: jest.fn().mockResolvedValue(orderItem),
        update: jest.fn().mockResolvedValue({
          ...orderItem,
          status: OrderItemStatus.RELEASED,
          confirmedAt: new Date('2026-07-03T09:10:00.000Z'),
          releasedAt: new Date('2026-07-03T09:10:00.000Z'),
        }),
        findMany: jest
          .fn()
          .mockResolvedValue([{ status: OrderItemStatus.RELEASED }]),
      },
      escrowTransaction: {
        update: jest.fn().mockResolvedValue({
          ...escrow,
          status: EscrowStatus.RELEASED,
          releasedAt: new Date('2026-07-03T09:10:00.000Z'),
        }),
      },
      wallet: {
        findFirst: jest.fn().mockResolvedValue(platformWallet),
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(platformWallet)
          .mockResolvedValueOnce(sellerWallet)
          .mockResolvedValueOnce(platformWallet),
        update: jest.fn(),
      },
      walletLedgerEntry: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'ledger_one' }),
      },
      order: {
        update: jest.fn().mockResolvedValue({
          id: 'order_one',
          status: OrderStatus.COMPLETED,
        }),
      },
    };
    prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as jest.Mocked<PrismaService>;
    service = new EscrowService(prisma);
  });

  it('releases held escrow to seller and records platform commission', async () => {
    const result = await service.releaseEscrowToSeller({
      orderItemId: 'order_item_one',
      reason: 'BUYER_CONFIRMATION',
      requireBuyerConfirmationState: true,
    });

    expect(tx.orderItem.findUnique).toHaveBeenCalledWith({
      where: { id: 'order_item_one' },
      include: expect.any(Object),
    });
    expect(tx.wallet.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'platform_wallet_one' },
      data: { escrowBalanceKobo: BigInt(29000) },
    });
    expect(tx.wallet.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'seller_wallet_one' },
      data: { availableBalanceKobo: BigInt(23000) },
    });
    expect(tx.wallet.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'platform_wallet_one' },
      data: { availableBalanceKobo: BigInt(6000) },
    });
    expect(tx.walletLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: 'platform_wallet_one',
        direction: LedgerDirection.DEBIT,
        entryType: LedgerEntryType.ESCROW_RELEASE,
        amountKobo: BigInt(21000),
        idempotencyKey: 'escrow:escrow_one:release:platform-debit',
      }),
    });
    expect(tx.walletLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: 'seller_wallet_one',
        direction: LedgerDirection.CREDIT,
        entryType: LedgerEntryType.ESCROW_RELEASE,
        amountKobo: BigInt(20000),
        idempotencyKey: 'escrow:escrow_one:release:seller-credit',
      }),
    });
    expect(tx.walletLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: 'platform_wallet_one',
        direction: LedgerDirection.CREDIT,
        entryType: LedgerEntryType.PLATFORM_COMMISSION,
        amountKobo: BigInt(1000),
        idempotencyKey: 'escrow:escrow_one:release:platform-commission',
      }),
    });
    expect(tx.escrowTransaction.update).toHaveBeenCalledWith({
      where: { id: 'escrow_one' },
      data: expect.objectContaining({ status: EscrowStatus.RELEASED }),
    });
    expect(tx.orderItem.update).toHaveBeenCalledWith({
      where: { id: 'order_item_one' },
      data: expect.objectContaining({
        status: OrderItemStatus.RELEASED,
        safetyTimerExpiresAt: null,
      }),
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order_one' },
      data: expect.objectContaining({ status: OrderStatus.COMPLETED }),
    });
    expect(result.orderItemStatus).toBe(OrderItemStatus.RELEASED);
    expect(result.escrowStatus).toBe(EscrowStatus.RELEASED);
    expect(result.sellerNetAmountKobo).toBe('20000');
  });

  it('rejects release when escrow is not held', async () => {
    tx.orderItem.findUnique.mockResolvedValue({
      ...orderItem,
      escrow: { ...escrow, status: EscrowStatus.DISPUTED },
    });

    await expect(
      service.releaseEscrowToSeller({
        orderItemId: 'order_item_one',
        reason: 'BUYER_CONFIRMATION',
        requireBuyerConfirmationState: true,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(tx.walletLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('rejects release when the seller wallet is missing', async () => {
    tx.orderItem.findUnique.mockResolvedValue({
      ...orderItem,
      sellerProfile: { id: 'store_one', wallet: null },
    });

    await expect(
      service.releaseEscrowToSeller({
        orderItemId: 'order_item_one',
        reason: 'BUYER_CONFIRMATION',
        requireBuyerConfirmationState: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
