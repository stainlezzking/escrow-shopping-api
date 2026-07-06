import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  DisputeStatus,
  EscrowStatus,
  LedgerDirection,
  LedgerEntryType,
  OrderItemStatus,
  OrderStatus,
  Prisma,
  Wallet,
  WalletOwnerType,
  WalletStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EscrowReleaseResponseDto } from './dto/escrow-release-response.dto';

type EscrowTransactionClient = Prisma.TransactionClient;

const activeDisputeStatuses = [
  DisputeStatus.OPEN,
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.AWAITING_BUYER_RETURN,
  DisputeStatus.RETURN_IN_TRANSIT,
];

const buyerConfirmationStatuses: OrderItemStatus[] = [
  OrderItemStatus.DISPATCHED,
  OrderItemStatus.DELIVERED,
];

const closedOrderItemStatuses: OrderItemStatus[] = [
  OrderItemStatus.RELEASED,
  OrderItemStatus.REFUNDED,
  OrderItemStatus.CANCELLED,
];

export interface ReleaseEscrowToSellerInput {
  orderItemId: string;
  reason: string;
  requireBuyerConfirmationState?: boolean;
}

/**
 * Handles escrow release state transitions and ledger-backed wallet movements.
 *
 * Escrow releases are executed inside a single Prisma transaction so escrow
 * state, order item state, wallet balances, and ledger entries remain aligned.
 */
@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Releases held escrow funds to the seller wallet and platform wallet.
   *
   * @param input - Order item and release reason metadata.
   * @returns Public-safe release result.
   * @throws NotFoundException when the order item, wallet, or escrow record is missing.
   * @throws UnprocessableEntityException when escrow is not eligible for release.
   */
  async releaseEscrowToSeller(
    input: ReleaseEscrowToSellerInput,
  ): Promise<EscrowReleaseResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.findUnique({
        where: { id: input.orderItemId },
        include: {
          escrow: true,
          sellerProfile: { include: { wallet: true } },
          disputes: {
            where: { status: { in: activeDisputeStatuses } },
            take: 1,
          },
        },
      });

      if (!orderItem) {
        throw new NotFoundException('Order item not found');
      }

      if (!orderItem.escrow) {
        throw new UnprocessableEntityException('Order item escrow not found');
      }
      const escrow = orderItem.escrow;

      if (
        orderItem.status === OrderItemStatus.RELEASED &&
        escrow.status === EscrowStatus.RELEASED &&
        orderItem.confirmedAt &&
        orderItem.releasedAt &&
        escrow.releasedAt
      ) {
        return {
          orderId: orderItem.orderId,
          orderItemId: orderItem.id,
          escrowId: escrow.id,
          orderItemStatus: orderItem.status,
          escrowStatus: escrow.status,
          sellerNetAmountKobo: escrow.sellerNetAmountKobo,
          platformFeeKobo: escrow.platformFeeKobo,
          confirmedAt: orderItem.confirmedAt,
          releasedAt: orderItem.releasedAt,
        };
      }

      this.assertReleaseEligible(
        { status: orderItem.status, escrow, disputes: orderItem.disputes },
        input.requireBuyerConfirmationState,
      );

      const sellerWallet = orderItem.sellerProfile.wallet;
      if (!sellerWallet || sellerWallet.status !== WalletStatus.ACTIVE) {
        throw new NotFoundException('Seller wallet not found');
      }

      const platformWallet = await this.getActivePlatformWallet(tx);
      const confirmedAt = new Date();
      const releasedAt = confirmedAt;

      await this.createWalletLedgerMovement({
        tx,
        walletId: platformWallet.id,
        direction: LedgerDirection.DEBIT,
        entryType: LedgerEntryType.ESCROW_RELEASE,
        amountKobo: escrow.grossAmountKobo,
        balanceField: 'escrowBalanceKobo',
        reference: `escrow-release:${escrow.escrowReference}:platform-debit`,
        idempotencyKey: `escrow:${escrow.id}:release:platform-debit`,
        relatedOrderId: orderItem.orderId,
        relatedOrderItemId: orderItem.id,
        relatedEscrowId: escrow.id,
        relatedPaymentId: escrow.paymentId ?? undefined,
        narration: `Escrow released to seller: ${input.reason}`,
      });

      await this.createWalletLedgerMovement({
        tx,
        walletId: sellerWallet.id,
        direction: LedgerDirection.CREDIT,
        entryType: LedgerEntryType.ESCROW_RELEASE,
        amountKobo: escrow.sellerNetAmountKobo,
        balanceField: 'availableBalanceKobo',
        reference: `escrow-release:${escrow.escrowReference}:seller-credit`,
        idempotencyKey: `escrow:${escrow.id}:release:seller-credit`,
        relatedOrderId: orderItem.orderId,
        relatedOrderItemId: orderItem.id,
        relatedEscrowId: escrow.id,
        relatedPaymentId: escrow.paymentId ?? undefined,
        narration: `Escrow released to seller: ${input.reason}`,
      });

      if (escrow.platformFeeKobo > BigInt(0)) {
        await this.createWalletLedgerMovement({
          tx,
          walletId: platformWallet.id,
          direction: LedgerDirection.CREDIT,
          entryType: LedgerEntryType.PLATFORM_COMMISSION,
          amountKobo: escrow.platformFeeKobo,
          balanceField: 'availableBalanceKobo',
          reference: `escrow-release:${escrow.escrowReference}:platform-commission`,
          idempotencyKey: `escrow:${escrow.id}:release:platform-commission`,
          relatedOrderId: orderItem.orderId,
          relatedOrderItemId: orderItem.id,
          relatedEscrowId: escrow.id,
          relatedPaymentId: escrow.paymentId ?? undefined,
          narration: `Platform commission recognized: ${input.reason}`,
        });
      }

      const releasedEscrow = await tx.escrowTransaction.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.RELEASED,
          releasedAt,
        },
      });
      const releasedOrderItem = await tx.orderItem.update({
        where: { id: orderItem.id },
        data: {
          status: OrderItemStatus.RELEASED,
          confirmedAt,
          releasedAt,
          safetyTimerExpiresAt: null,
        },
      });

      await this.updateParentOrderStatus(tx, orderItem.orderId);

      return {
        orderId: orderItem.orderId,
        orderItemId: releasedOrderItem.id,
        escrowId: releasedEscrow.id,
        orderItemStatus: releasedOrderItem.status,
        escrowStatus: releasedEscrow.status,
        sellerNetAmountKobo: releasedEscrow.sellerNetAmountKobo,
        platformFeeKobo: releasedEscrow.platformFeeKobo,
        confirmedAt,
        releasedAt,
      };
    });

    this.logger.log(`Escrow released for order item ${input.orderItemId}`);

    return {
      ...result,
      sellerNetAmountKobo: result.sellerNetAmountKobo.toString(),
      platformFeeKobo: result.platformFeeKobo.toString(),
    };
  }

  private assertReleaseEligible(
    orderItem: {
      status: OrderItemStatus;
      escrow: {
        status: EscrowStatus;
        releasedAt: Date | null;
        refundedAt: Date | null;
      };
      disputes: unknown[];
    },
    requireBuyerConfirmationState: boolean | undefined,
  ): void {
    if (
      requireBuyerConfirmationState &&
      !buyerConfirmationStatuses.includes(orderItem.status)
    ) {
      throw new UnprocessableEntityException(
        'Order item cannot be confirmed from its current state',
      );
    }

    if (
      orderItem.status === OrderItemStatus.DISPUTED ||
      orderItem.status === OrderItemStatus.RELEASED ||
      orderItem.status === OrderItemStatus.REFUNDED ||
      orderItem.status === OrderItemStatus.CANCELLED
    ) {
      throw new UnprocessableEntityException(
        'Order item cannot be released from its current state',
      );
    }

    if (orderItem.escrow.status !== EscrowStatus.HELD) {
      throw new UnprocessableEntityException('Order item escrow is not held');
    }

    if (orderItem.escrow.releasedAt || orderItem.escrow.refundedAt) {
      throw new UnprocessableEntityException(
        'Order item escrow is already closed',
      );
    }

    if (orderItem.disputes.length > 0) {
      throw new UnprocessableEntityException(
        'Disputed order items cannot be released by buyer confirmation',
      );
    }
  }

  private async getActivePlatformWallet(
    tx: EscrowTransactionClient,
  ): Promise<Wallet> {
    const wallet = await tx.wallet.findFirst({
      where: {
        ownerType: WalletOwnerType.PLATFORM,
        status: WalletStatus.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!wallet) {
      throw new NotFoundException('Platform escrow wallet not found');
    }

    return wallet;
  }

  private async createWalletLedgerMovement(input: {
    tx: EscrowTransactionClient;
    walletId: string;
    direction: LedgerDirection;
    entryType: LedgerEntryType;
    amountKobo: bigint;
    balanceField:
      | 'availableBalanceKobo'
      | 'escrowBalanceKobo'
      | 'pendingPayoutBalanceKobo';
    reference: string;
    idempotencyKey: string;
    relatedOrderId: string;
    relatedOrderItemId: string;
    relatedEscrowId: string;
    relatedPaymentId?: string;
    narration: string;
  }): Promise<void> {
    const existingLedgerEntry = await input.tx.walletLedgerEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });

    if (existingLedgerEntry) {
      return;
    }

    const wallet = await input.tx.wallet.findUnique({
      where: { id: input.walletId },
    });

    if (!wallet || wallet.status !== WalletStatus.ACTIVE) {
      throw new NotFoundException('Wallet not found');
    }

    const balanceBefore = wallet[input.balanceField];
    const balanceAfter =
      input.direction === LedgerDirection.CREDIT
        ? balanceBefore + input.amountKobo
        : balanceBefore - input.amountKobo;

    if (balanceAfter < BigInt(0)) {
      throw new UnprocessableEntityException('Insufficient wallet balance');
    }

    await input.tx.wallet.update({
      where: { id: wallet.id },
      data: { [input.balanceField]: balanceAfter },
    });

    await input.tx.walletLedgerEntry.create({
      data: {
        walletId: wallet.id,
        direction: input.direction,
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
        narration: input.narration,
      },
    });
  }

  private async updateParentOrderStatus(
    tx: EscrowTransactionClient,
    orderId: string,
  ): Promise<void> {
    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
      select: { status: true },
    });
    const allItemsClosed = orderItems.every((item) =>
      closedOrderItemStatuses.includes(item.status),
    );

    await tx.order.update({
      where: { id: orderId },
      data: allItemsClosed
        ? { status: OrderStatus.COMPLETED, completedAt: new Date() }
        : { status: OrderStatus.PARTIALLY_FULFILLED },
    });
  }
}
