import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  LedgerDirection,
  Prisma,
  Wallet,
  WalletOwnerType,
  WalletStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateWalletInput,
  WalletMovementInput,
  WalletMovementResult,
} from './types/wallet-operation.types';

type WalletTransactionClient = Pick<
  Prisma.TransactionClient,
  'wallet' | 'walletLedgerEntry'
>;

const ownerFieldByType: Record<WalletOwnerType, keyof CreateWalletInput> = {
  [WalletOwnerType.BUYER]: 'buyerProfileId',
  [WalletOwnerType.SELLER]: 'sellerProfileId',
  [WalletOwnerType.PLATFORM]: 'platformEntityId',
};

/**
 * Coordinates wallet creation and ledger-backed balance movements.
 *
 * Wallet balances are cached accounting balances. Every balance mutation in
 * this service creates a corresponding append-only ledger entry inside the
 * same Prisma transaction.
 */
@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a wallet for a buyer, seller store, or platform entity.
   *
   * @param input - Wallet owner metadata.
   * @returns The created wallet.
   * @throws UnprocessableEntityException when ownership fields are invalid.
   * @throws ConflictException when the owner already has a wallet.
   */
  async createWallet(input: CreateWalletInput): Promise<Wallet> {
    this.assertValidWalletOwner(input);

    try {
      const wallet = await this.prisma.$transaction((tx) =>
        tx.wallet.create({
          data: {
            ownerType: input.ownerType,
            buyerProfileId: input.buyerProfileId,
            sellerProfileId: input.sellerProfileId,
            platformEntityId: input.platformEntityId,
            status: WalletStatus.ACTIVE,
          },
        }),
      );

      this.logger.log(`Wallet created: ${wallet.id}`);

      return wallet;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Wallet already exists for this owner');
      }

      throw error;
    }
  }

  /**
   * Credits a wallet balance and creates a matching ledger entry.
   *
   * @param input - Validated wallet movement details.
   * @returns Updated wallet and created ledger entry.
   */
  async creditWallet(
    input: WalletMovementInput,
  ): Promise<WalletMovementResult> {
    return this.moveWalletBalance(input, LedgerDirection.CREDIT);
  }

  /**
   * Debits a wallet balance and creates a matching ledger entry.
   *
   * @param input - Validated wallet movement details.
   * @returns Updated wallet and created ledger entry.
   * @throws UnprocessableEntityException when the debit would go negative.
   */
  async debitWallet(input: WalletMovementInput): Promise<WalletMovementResult> {
    return this.moveWalletBalance(input, LedgerDirection.DEBIT);
  }

  private async moveWalletBalance(
    input: WalletMovementInput,
    direction: LedgerDirection,
  ): Promise<WalletMovementResult> {
    this.assertPositiveAmount(input.amountKobo);

    return this.prisma.$transaction(async (tx) => {
      const existingLedgerEntry = await tx.walletLedgerEntry.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existingLedgerEntry) {
        return {
          wallet: null,
          ledgerEntry: existingLedgerEntry,
          wasIdempotentReplay: true,
        };
      }

      const wallet = await this.getActiveWalletOrThrow(tx, input.walletId);
      const balanceField = input.balanceField ?? 'availableBalanceKobo';
      const balanceBefore = wallet[balanceField];
      const balanceAfter = this.calculateBalanceAfter(
        balanceBefore,
        input.amountKobo,
        direction,
      );

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { [balanceField]: balanceAfter },
      });

      const ledgerEntry = await tx.walletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          direction,
          entryType: input.entryType,
          amountKobo: input.amountKobo,
          balanceBeforeKobo: balanceBefore,
          balanceAfterKobo: balanceAfter,
          reference: input.reference,
          idempotencyKey: input.idempotencyKey,
          relatedOrderId: input.relatedOrderId,
          relatedOrderItemId: input.relatedOrderItemId,
          relatedEscrowId: input.relatedEscrowId,
          relatedPaymentId: input.relatedPaymentId,
          relatedPayoutRecordId: input.relatedPayoutRecordId,
          narration: input.narration,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });

      this.logger.log(
        `Wallet ${direction.toLowerCase()} recorded for wallet ${wallet.id}: ${ledgerEntry.id}`,
      );

      return {
        wallet: updatedWallet,
        ledgerEntry,
        wasIdempotentReplay: false,
      };
    });
  }

  private async getActiveWalletOrThrow(
    tx: WalletTransactionClient,
    walletId: string,
  ): Promise<Wallet> {
    const wallet = await tx.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.status !== WalletStatus.ACTIVE) {
      throw new UnprocessableEntityException('Wallet is not active');
    }

    return wallet;
  }

  private calculateBalanceAfter(
    balanceBefore: bigint,
    amountKobo: bigint,
    direction: LedgerDirection,
  ): bigint {
    if (direction === LedgerDirection.CREDIT) {
      return balanceBefore + amountKobo;
    }

    const balanceAfter = balanceBefore - amountKobo;

    if (balanceAfter < BigInt(0)) {
      throw new UnprocessableEntityException('Insufficient wallet balance');
    }

    return balanceAfter;
  }

  private assertPositiveAmount(amountKobo: bigint): void {
    if (amountKobo <= BigInt(0)) {
      throw new UnprocessableEntityException(
        'Wallet movement amount must be greater than zero',
      );
    }
  }

  private assertValidWalletOwner(input: CreateWalletInput): void {
    const expectedOwnerField = ownerFieldByType[input.ownerType];
    const ownerFields = [
      input.buyerProfileId,
      input.sellerProfileId,
      input.platformEntityId,
    ].filter(Boolean);

    if (ownerFields.length !== 1 || !input[expectedOwnerField]) {
      throw new UnprocessableEntityException(
        'Wallet must have exactly one owner matching its owner type',
      );
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
