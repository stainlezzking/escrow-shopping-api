import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  EscrowStatus,
  LedgerDirection,
  LedgerEntryType,
  OrderItemStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  Wallet,
  WalletOwnerType,
  WalletStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InitiatePaymentInput } from './dto/payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { mapPayment } from './payment.mapper';
import { PAYMENT_PROVIDER_PORT } from './providers/payment-provider.interface';
import type {
  PaymentProviderPort,
  PaymentWebhookEvent,
  VerifyProviderPaymentResult,
} from './providers/payment-provider.interface';

const paymentProcessingInclude = {
  order: {
    include: {
      buyerProfile: {
        include: {
          user: { select: { email: true } },
        },
      },
      items: true,
    },
  },
} as const;

type PaymentWithOrder = Prisma.PaymentGetPayload<{
  include: typeof paymentProcessingInclude;
}>;

type PaymentTransactionClient = Prisma.TransactionClient;

/**
 * Handles payment initiation, server-side verification, and webhook processing.
 *
 * Payment success can only come from provider verification or a verified
 * webhook. This service never accepts frontend confirmation as proof of
 * payment.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_PORT)
    private readonly paymentProvider: PaymentProviderPort,
  ) {}

  /**
   * Initiates a provider payment attempt from a backend-created order total.
   *
   * @param userId - Authenticated buyer user ID.
   * @param input - Validated payment initiation input.
   * @returns Pending payment response and provider authorization URL.
   */
  async initiatePayment(
    userId: string,
    input: InitiatePaymentInput,
  ): Promise<PaymentResponseDto> {
    this.assertConfiguredProvider(input.provider);

    const order = await this.prisma.order.findFirst({
      where: {
        id: input.orderId,
        buyerProfile: { userId },
      },
      include: {
        buyerProfile: {
          include: { user: { select: { email: true } } },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new UnprocessableEntityException(
        'Payment can only be initiated for pending-payment orders',
      );
    }

    const internalReference = this.generateInternalReference();
    const providerResult = await this.paymentProvider.initiatePayment({
      internalReference,
      amountKobo: order.totalOrderAmountKobo,
      currency: 'NGN',
      orderId: order.id,
      orderReference: order.orderReference,
      buyerProfileId: order.buyerProfileId,
      buyerEmail: order.buyerProfile.user.email,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        buyerProfileId: order.buyerProfileId,
        provider: input.provider,
        providerReference: providerResult.providerReference,
        internalReference,
        status: PaymentStatus.PENDING,
        amountKobo: order.totalOrderAmountKobo,
        currency: 'NGN',
        providerPayload: providerResult.providerPayload as
          | Prisma.InputJsonValue
          | undefined,
      },
    });

    this.logger.log(`Payment initiated for order ${order.id}: ${payment.id}`);

    return mapPayment(payment, providerResult.authorizationUrl);
  }

  /**
   * Verifies a payment directly with the configured provider.
   *
   * @param userId - Authenticated buyer user ID.
   * @param paymentId - Payment attempt ID.
   * @returns Payment response after provider verification.
   */
  async verifyPayment(
    userId: string,
    paymentId: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: paymentProcessingInclude,
    });

    if (!payment || payment.order.buyerProfile.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return mapPayment(payment);
    }

    const providerReference =
      payment.providerReference ?? payment.internalReference;
    const providerResult =
      await this.paymentProvider.verifyPayment(providerReference);

    if (providerResult.status === 'success') {
      this.assertProviderSuccessMatchesPayment(payment, providerResult);

      return this.markPaymentSuccessful(payment, {
        providerReference: providerResult.providerReference,
        providerPayload: providerResult.providerPayload,
      });
    }

    if (providerResult.status === 'failed') {
      const failedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerPayload: providerResult.providerPayload as
            | Prisma.InputJsonValue
            | undefined,
          failedAt: new Date(),
        },
      });

      return mapPayment(failedPayment);
    }

    return mapPayment(payment);
  }

  /**
   * Processes a provider webhook after signature verification.
   *
   * @param provider - Provider route parameter.
   * @param payload - Parsed webhook payload.
   * @param signature - Provider signature header.
   * @returns Payment response when a matching payment exists.
   */
  async handleWebhook(
    provider: PaymentProvider,
    payload: Record<string, unknown>,
    signature: string,
    rawBody?: Buffer | string,
  ): Promise<PaymentResponseDto> {
    this.assertConfiguredProvider(provider);

    if (
      !this.paymentProvider.verifyWebhookSignature(payload, signature, rawBody)
    ) {
      throw new UnauthorizedException('Invalid payment webhook signature');
    }

    const event = this.paymentProvider.parseWebhook(payload);
    const payment = await this.prisma.payment.findUnique({
      where: { providerReference: event.providerReference },
      include: paymentProcessingInclude,
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return mapPayment(payment);
    }

    if (event.status === 'success') {
      this.assertWebhookEventMatchesPayment(payment, event);
      const providerResult = await this.paymentProvider.verifyPayment(
        event.providerReference,
      );

      this.assertProviderSuccessMatchesPayment(payment, providerResult);

      return this.markPaymentSuccessful(payment, {
        providerReference: providerResult.providerReference,
        providerPayload: {
          ...(event.providerPayload ?? {}),
          ...(providerResult.providerPayload ?? {}),
        },
      });
    }

    if (event.status === 'failed') {
      const failedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerPayload: event.providerPayload as
            | Prisma.InputJsonValue
            | undefined,
          failedAt: new Date(),
        },
      });

      return mapPayment(failedPayment);
    }

    return mapPayment(payment);
  }

  private async markPaymentSuccessful(
    payment: PaymentWithOrder,
    providerData: {
      providerReference: string;
      providerPayload?: Record<string, unknown>;
    },
  ): Promise<PaymentResponseDto> {
    const paidPayment = await this.prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: { id: payment.id },
      });

      if (!currentPayment) {
        throw new NotFoundException('Payment not found');
      }

      if (currentPayment.status === PaymentStatus.SUCCESS) {
        return currentPayment;
      }

      const platformEscrowWallet =
        await this.getOrCreatePlatformEscrowWallet(tx);
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          providerReference: providerData.providerReference,
          providerPayload: providerData.providerPayload as
            | Prisma.InputJsonValue
            | undefined,
          verifiedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID },
      });

      await tx.orderItem.updateMany({
        where: {
          orderId: payment.orderId,
          status: OrderItemStatus.PENDING_PAYMENT,
        },
        data: { status: OrderItemStatus.AWAITING_DISPATCH },
      });

      for (const item of payment.order.items) {
        const grossAmountKobo =
          item.netEscrowAmountKobo + item.serviceFeeKobo + item.shippingFeeKobo;
        const escrow = await tx.escrowTransaction.upsert({
          where: { orderItemId: item.id },
          create: {
            orderItemId: item.id,
            sellerProfileId: item.sellerProfileId,
            buyerProfileId: payment.buyerProfileId,
            paymentId: payment.id,
            escrowReference: this.generateEscrowReference(item.id),
            status: EscrowStatus.HELD,
            grossAmountKobo,
            sellerNetAmountKobo: item.netEscrowAmountKobo,
            platformFeeKobo: item.serviceFeeKobo,
            shippingFeeKobo: item.shippingFeeKobo,
            heldAt: new Date(),
          },
          update: {
            paymentId: payment.id,
            status: EscrowStatus.HELD,
            heldAt: new Date(),
          },
        });

        await this.createEscrowHoldLedgerEntry({
          tx,
          walletId: platformEscrowWallet.id,
          amountKobo: grossAmountKobo,
          orderId: payment.orderId,
          orderItemId: item.id,
          escrowId: escrow.id,
          paymentId: payment.id,
          escrowReference: escrow.escrowReference,
        });
      }

      return updatedPayment;
    });

    this.logger.log(`Payment verified server-side: ${payment.id}`);

    return mapPayment(paidPayment);
  }

  private assertConfiguredProvider(provider: PaymentProvider): void {
    if (provider !== this.paymentProvider.provider) {
      throw new UnprocessableEntityException(
        'Requested payment provider is not configured',
      );
    }
  }

  private assertProviderSuccessMatchesPayment(
    payment: PaymentWithOrder,
    result: VerifyProviderPaymentResult,
  ): void {
    if (
      result.status !== 'success' ||
      result.providerReference !== payment.providerReference ||
      result.amountKobo !== payment.amountKobo ||
      result.currency !== payment.currency
    ) {
      throw new UnprocessableEntityException(
        'Payment provider verification did not match the payment record',
      );
    }
  }

  private assertWebhookEventMatchesPayment(
    payment: PaymentWithOrder,
    event: PaymentWebhookEvent,
  ): void {
    if (
      event.providerReference !== payment.providerReference ||
      event.amountKobo !== payment.amountKobo ||
      event.currency !== payment.currency
    ) {
      throw new UnprocessableEntityException(
        'Payment webhook did not match the payment record',
      );
    }
  }

  private async getOrCreatePlatformEscrowWallet(
    tx: PaymentTransactionClient,
  ): Promise<Wallet> {
    const existingWallet = await tx.wallet.findFirst({
      where: {
        ownerType: WalletOwnerType.PLATFORM,
        status: WalletStatus.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (existingWallet) {
      return existingWallet;
    }

    const platformEntity = await tx.platformEntity.create({
      data: { organizationName: 'Escrova Platform' },
    });

    return tx.wallet.create({
      data: {
        ownerType: WalletOwnerType.PLATFORM,
        platformEntityId: platformEntity.id,
        status: WalletStatus.ACTIVE,
      },
    });
  }

  private async createEscrowHoldLedgerEntry(input: {
    tx: PaymentTransactionClient;
    walletId: string;
    amountKobo: bigint;
    orderId: string;
    orderItemId: string;
    escrowId: string;
    paymentId: string;
    escrowReference: string;
  }): Promise<void> {
    const idempotencyKey = `payment:${input.paymentId}:escrow-hold:${input.orderItemId}`;
    const existingLedgerEntry = await input.tx.walletLedgerEntry.findUnique({
      where: { idempotencyKey },
    });

    if (existingLedgerEntry) {
      return;
    }

    const wallet = await input.tx.wallet.findUnique({
      where: { id: input.walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Platform escrow wallet not found');
    }

    const balanceBefore = wallet.escrowBalanceKobo;
    const balanceAfter = balanceBefore + input.amountKobo;

    await input.tx.wallet.update({
      where: { id: wallet.id },
      data: { escrowBalanceKobo: balanceAfter },
    });

    await input.tx.walletLedgerEntry.create({
      data: {
        walletId: wallet.id,
        direction: LedgerDirection.CREDIT,
        entryType: LedgerEntryType.ESCROW_HOLD,
        amountKobo: input.amountKobo,
        balanceBeforeKobo: balanceBefore,
        balanceAfterKobo: balanceAfter,
        reference: `escrow-hold:${input.escrowReference}`,
        idempotencyKey,
        relatedOrderId: input.orderId,
        relatedOrderItemId: input.orderItemId,
        relatedEscrowId: input.escrowId,
        relatedPaymentId: input.paymentId,
        narration: 'Escrow funded after verified payment',
      },
    });
  }

  private generateInternalReference(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();

    return `PAY-${date}-${random}`;
  }

  private generateEscrowReference(orderItemId: string): string {
    return `ESC-${orderItemId}`;
  }
}
