/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */

import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  LedgerDirection,
  LedgerEntryType,
  WalletOwnerType,
  WalletStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { WalletsService } from './wallets.service';

describe('WalletsService', () => {
  const wallet = {
    id: 'wallet_one',
    ownerType: WalletOwnerType.BUYER,
    buyerProfileId: 'buyer_one',
    sellerProfileId: null,
    platformEntityId: null,
    availableBalanceKobo: BigInt(5000),
    escrowBalanceKobo: BigInt(0),
    pendingPayoutBalanceKobo: BigInt(0),
    payoutPinHash: null,
    status: WalletStatus.ACTIVE,
    createdAt: new Date('2026-06-20T12:00:00.000Z'),
    updatedAt: new Date('2026-06-20T12:00:00.000Z'),
  };

  const ledgerEntry = {
    id: 'ledger_one',
    walletId: 'wallet_one',
    direction: LedgerDirection.CREDIT,
    entryType: LedgerEntryType.REFUND,
    amountKobo: BigInt(1500),
    balanceBeforeKobo: BigInt(5000),
    balanceAfterKobo: BigInt(6500),
    reference: 'refund:order_item_one',
    idempotencyKey: 'refund:order_item_one:buyer_wallet',
    relatedOrderId: null,
    relatedOrderItemId: 'order_item_one',
    relatedEscrowId: null,
    relatedPaymentId: null,
    relatedPayoutRecordId: null,
    narration: 'Buyer refund',
    metadata: null,
    createdAt: new Date('2026-06-20T12:01:00.000Z'),
  };

  let tx: {
    wallet: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    walletLedgerEntry: { create: jest.Mock; findUnique: jest.Mock };
  };
  let prisma: jest.Mocked<PrismaService>;
  let service: WalletsService;

  beforeEach(() => {
    tx = {
      wallet: {
        create: jest.fn().mockResolvedValue(wallet),
        findUnique: jest.fn().mockResolvedValue(wallet),
        update: jest.fn().mockResolvedValue({
          ...wallet,
          availableBalanceKobo: BigInt(6500),
        }),
      },
      walletLedgerEntry: {
        create: jest.fn().mockResolvedValue(ledgerEntry),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    prisma = {
      wallet: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      walletLedgerEntry: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as jest.Mocked<PrismaService>;

    service = new WalletsService(prisma);
  });

  it('creates a wallet for exactly one owner', async () => {
    const result = await service.createWallet({
      ownerType: WalletOwnerType.BUYER,
      buyerProfileId: 'buyer_one',
    });

    expect(tx.wallet.create).toHaveBeenCalledWith({
      data: {
        ownerType: WalletOwnerType.BUYER,
        buyerProfileId: 'buyer_one',
        status: WalletStatus.ACTIVE,
      },
    });
    expect(result.id).toBe('wallet_one');
  });

  it('rejects wallet creation when owner fields do not match the owner type', async () => {
    await expect(
      service.createWallet({
        ownerType: WalletOwnerType.SELLER,
        buyerProfileId: 'buyer_one',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('converts unique owner conflicts into a safe conflict exception', async () => {
    tx.wallet.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.createWallet({
        ownerType: WalletOwnerType.BUYER,
        buyerProfileId: 'buyer_one',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('credits a wallet and records balance before and after in a ledger entry', async () => {
    const result = await service.creditWallet({
      walletId: 'wallet_one',
      amountKobo: BigInt(1500),
      entryType: LedgerEntryType.REFUND,
      reference: 'refund:order_item_one',
      idempotencyKey: 'refund:order_item_one:buyer_wallet',
      relatedOrderItemId: 'order_item_one',
      narration: 'Buyer refund',
    });

    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { id: 'wallet_one' },
      data: { availableBalanceKobo: BigInt(6500) },
    });
    expect(tx.walletLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: 'wallet_one',
        direction: LedgerDirection.CREDIT,
        amountKobo: BigInt(1500),
        balanceBeforeKobo: BigInt(5000),
        balanceAfterKobo: BigInt(6500),
      }),
    });
    expect(result.ledgerEntry.id).toBe('ledger_one');
  });

  it('does not credit twice for the same idempotency key', async () => {
    tx.walletLedgerEntry.findUnique.mockResolvedValue(ledgerEntry);

    const result = await service.creditWallet({
      walletId: 'wallet_one',
      amountKobo: BigInt(1500),
      entryType: LedgerEntryType.REFUND,
      reference: 'refund:order_item_one',
      idempotencyKey: 'refund:order_item_one:buyer_wallet',
    });

    expect(tx.wallet.update).not.toHaveBeenCalled();
    expect(tx.walletLedgerEntry.create).not.toHaveBeenCalled();
    expect(result.ledgerEntry.id).toBe('ledger_one');
  });

  it('debits a wallet and records balance before and after in a ledger entry', async () => {
    tx.wallet.update.mockResolvedValue({
      ...wallet,
      availableBalanceKobo: BigInt(3000),
    });
    tx.walletLedgerEntry.create.mockResolvedValue({
      ...ledgerEntry,
      direction: LedgerDirection.DEBIT,
      entryType: LedgerEntryType.PAYOUT,
      amountKobo: BigInt(2000),
      balanceAfterKobo: BigInt(3000),
      idempotencyKey: 'payout:record_one:seller_wallet',
    });

    const result = await service.debitWallet({
      walletId: 'wallet_one',
      amountKobo: BigInt(2000),
      entryType: LedgerEntryType.PAYOUT,
      reference: 'payout:record_one',
      idempotencyKey: 'payout:record_one:seller_wallet',
    });

    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { id: 'wallet_one' },
      data: { availableBalanceKobo: BigInt(3000) },
    });
    expect(result.ledgerEntry.direction).toBe(LedgerDirection.DEBIT);
  });

  it('prevents negative balances on debit', async () => {
    await expect(
      service.debitWallet({
        walletId: 'wallet_one',
        amountKobo: BigInt(6000),
        entryType: LedgerEntryType.PAYOUT,
        reference: 'payout:record_one',
        idempotencyKey: 'payout:record_one:seller_wallet',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(tx.wallet.update).not.toHaveBeenCalled();
    expect(tx.walletLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('rejects inactive or missing wallets before mutation', async () => {
    tx.wallet.findUnique.mockResolvedValue(null);

    await expect(
      service.creditWallet({
        walletId: 'missing_wallet',
        amountKobo: BigInt(100),
        entryType: LedgerEntryType.REFUND,
        reference: 'refund:missing',
        idempotencyKey: 'refund:missing:wallet',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
