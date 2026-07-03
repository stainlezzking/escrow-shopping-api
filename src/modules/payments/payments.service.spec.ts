/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import {
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
  WalletOwnerType,
  WalletStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PaymentProviderPort } from './providers/payment-provider.interface';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const orderItem = {
    id: 'order_item_one',
    orderId: 'order_one',
    productId: 'product_one',
    sellerProfileId: 'store_one',
    quantity: 2,
    unitPriceAtCheckoutKobo: BigInt(10000),
    productAmountKobo: BigInt(20000),
    shippingFeeKobo: BigInt(0),
    serviceFeeKobo: BigInt(1000),
    netEscrowAmountKobo: BigInt(20000),
    status: OrderItemStatus.PENDING_PAYMENT,
    deliveryHandledBy: null,
    safetyTimerExpiresAt: null,
    dispatchedAt: null,
    deliveredAt: null,
    confirmedAt: null,
    releasedAt: null,
    refundedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-07-03T09:00:00.000Z'),
    updatedAt: new Date('2026-07-03T09:00:00.000Z'),
  };

  const order = {
    id: 'order_one',
    buyerProfileId: 'buyer_profile_one',
    orderReference: 'ORD-20260703-ABC123',
    status: OrderStatus.PENDING_PAYMENT,
    totalProductAmountKobo: BigInt(20000),
    totalShippingFeeKobo: BigInt(0),
    totalServiceFeeKobo: BigInt(1000),
    totalOrderAmountKobo: BigInt(21000),
    cancelledAt: null,
    completedAt: null,
    createdAt: new Date('2026-07-03T09:00:00.000Z'),
    updatedAt: new Date('2026-07-03T09:00:00.000Z'),
    buyerProfile: {
      id: 'buyer_profile_one',
      userId: 'buyer_user',
      fullName: 'Ada Buyer',
      user: { email: 'buyer@example.com' },
    },
    items: [orderItem],
  };

  const payment = {
    id: 'payment_one',
    orderId: 'order_one',
    buyerProfileId: 'buyer_profile_one',
    provider: PaymentProvider.PAYSTACK,
    providerReference: 'paystack_ref_one',
    internalReference: 'PAY-20260703-ABC123',
    status: PaymentStatus.PENDING,
    amountKobo: BigInt(21000),
    currency: 'NGN',
    providerPayload: null,
    verifiedAt: null,
    failedAt: null,
    createdAt: new Date('2026-07-03T09:01:00.000Z'),
    updatedAt: new Date('2026-07-03T09:01:00.000Z'),
    order,
  };
  const platformEscrowWallet = {
    id: 'platform_wallet_one',
    ownerType: WalletOwnerType.PLATFORM,
    buyerProfileId: null,
    sellerProfileId: null,
    platformEntityId: 'platform_entity_one',
    availableBalanceKobo: BigInt(0),
    escrowBalanceKobo: BigInt(50000),
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

  let tx: {
    payment: { findUnique: jest.Mock; update: jest.Mock };
    order: { update: jest.Mock };
    orderItem: { updateMany: jest.Mock };
    escrowTransaction: { upsert: jest.Mock };
    wallet: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    platformEntity: { create: jest.Mock };
    walletLedgerEntry: { findUnique: jest.Mock; create: jest.Mock };
  };
  let prisma: jest.Mocked<PrismaService>;
  let provider: jest.Mocked<PaymentProviderPort>;
  let service: PaymentsService;

  beforeEach(() => {
    tx = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({
          ...payment,
          status: PaymentStatus.SUCCESS,
          verifiedAt: new Date('2026-07-03T09:02:00.000Z'),
        }),
      },
      order: {
        update: jest
          .fn()
          .mockResolvedValue({ ...order, status: OrderStatus.PAID }),
      },
      orderItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      escrowTransaction: {
        upsert: jest.fn().mockResolvedValue(escrow),
      },
      wallet: {
        findFirst: jest.fn().mockResolvedValue(platformEscrowWallet),
        findUnique: jest.fn().mockResolvedValue(platformEscrowWallet),
        update: jest.fn().mockResolvedValue({
          ...platformEscrowWallet,
          escrowBalanceKobo: BigInt(71000),
        }),
        create: jest.fn().mockResolvedValue(platformEscrowWallet),
      },
      platformEntity: {
        create: jest.fn().mockResolvedValue({
          id: 'platform_entity_one',
          organizationName: 'Escrova Platform',
        }),
      },
      walletLedgerEntry: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'ledger_one',
          walletId: 'platform_wallet_one',
        }),
      },
    };

    prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue(order),
      },
      payment: {
        create: jest.fn().mockResolvedValue(payment),
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(payment),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as jest.Mocked<PrismaService>;

    provider = {
      provider: PaymentProvider.PAYSTACK,
      initiatePayment: jest.fn().mockResolvedValue({
        authorizationUrl: 'https://checkout.paystack.com/paystack_ref_one',
        providerReference: 'paystack_ref_one',
      }),
      verifyPayment: jest.fn().mockResolvedValue({
        status: 'success',
        providerReference: 'paystack_ref_one',
        amountKobo: BigInt(21000),
        currency: 'NGN',
        providerPayload: { status: 'success' },
      }),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      parseWebhook: jest.fn().mockReturnValue({
        providerReference: 'paystack_ref_one',
        status: 'success',
        amountKobo: BigInt(21000),
        currency: 'NGN',
        providerPayload: { event: 'charge.success' },
      }),
    };

    service = new PaymentsService(prisma, provider);
  });

  it('initiates payment from a buyer-owned pending order total', async () => {
    const result = await service.initiatePayment('buyer_user', {
      orderId: 'order_one',
      provider: PaymentProvider.PAYSTACK,
    });

    expect(provider.initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amountKobo: BigInt(21000),
        currency: 'NGN',
        orderId: 'order_one',
        orderReference: 'ORD-20260703-ABC123',
        buyerProfileId: 'buyer_profile_one',
        buyerEmail: 'buyer@example.com',
      }),
    );
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order_one',
        buyerProfileId: 'buyer_profile_one',
        provider: PaymentProvider.PAYSTACK,
        providerReference: 'paystack_ref_one',
        status: PaymentStatus.PENDING,
        amountKobo: BigInt(21000),
      }),
    });
    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(result.amountKobo).toBe('21000');
    expect(result.authorizationUrl).toContain('paystack_ref_one');
  });

  it('rejects payment initiation for a missing or non-owned order', async () => {
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(
      service.initiatePayment('buyer_user', {
        orderId: 'missing_order',
        provider: PaymentProvider.PAYSTACK,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects payment initiation when order is not pending payment', async () => {
    prisma.order.findFirst.mockResolvedValue({
      ...order,
      status: OrderStatus.PAID,
    });

    await expect(
      service.initiatePayment('buyer_user', {
        orderId: 'order_one',
        provider: PaymentProvider.PAYSTACK,
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('verifies payment server-side and funds order item escrow once', async () => {
    const result = await service.verifyPayment('buyer_user', 'payment_one');

    expect(provider.verifyPayment).toHaveBeenCalledWith('paystack_ref_one');
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment_one' },
      data: expect.objectContaining({
        status: PaymentStatus.SUCCESS,
        providerReference: 'paystack_ref_one',
        verifiedAt: expect.any(Date),
      }),
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order_one' },
      data: { status: OrderStatus.PAID },
    });
    expect(tx.orderItem.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'order_one', status: OrderItemStatus.PENDING_PAYMENT },
      data: { status: OrderItemStatus.AWAITING_DISPATCH },
    });
    expect(tx.escrowTransaction.upsert).toHaveBeenCalledWith({
      where: { orderItemId: 'order_item_one' },
      create: expect.objectContaining({
        orderItemId: 'order_item_one',
        sellerProfileId: 'store_one',
        buyerProfileId: 'buyer_profile_one',
        paymentId: 'payment_one',
        status: EscrowStatus.HELD,
        grossAmountKobo: BigInt(21000),
        sellerNetAmountKobo: BigInt(20000),
        platformFeeKobo: BigInt(1000),
      }),
      update: expect.objectContaining({
        paymentId: 'payment_one',
        status: EscrowStatus.HELD,
      }),
    });
    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { id: 'platform_wallet_one' },
      data: { escrowBalanceKobo: BigInt(71000) },
    });
    expect(tx.walletLedgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: 'platform_wallet_one',
        direction: LedgerDirection.CREDIT,
        entryType: LedgerEntryType.ESCROW_HOLD,
        amountKobo: BigInt(21000),
        balanceBeforeKobo: BigInt(50000),
        balanceAfterKobo: BigInt(71000),
        reference: 'escrow-hold:ESC-order_item_one',
        idempotencyKey: 'payment:payment_one:escrow-hold:order_item_one',
        relatedOrderId: 'order_one',
        relatedOrderItemId: 'order_item_one',
        relatedEscrowId: 'escrow_one',
        relatedPaymentId: 'payment_one',
      }),
    });
    expect(result.status).toBe(PaymentStatus.SUCCESS);
  });

  it('does not process successful payment twice', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      ...payment,
      status: PaymentStatus.SUCCESS,
    });

    await service.verifyPayment('buyer_user', 'payment_one');

    expect(provider.verifyPayment).not.toHaveBeenCalled();
    expect(tx.escrowTransaction.upsert).not.toHaveBeenCalled();
    expect(tx.walletLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('does not duplicate escrow or ledger entries when payment becomes successful inside the transaction', async () => {
    tx.payment.findUnique.mockResolvedValue({
      ...payment,
      status: PaymentStatus.SUCCESS,
    });

    const result = await service.verifyPayment('buyer_user', 'payment_one');

    expect(result.status).toBe(PaymentStatus.SUCCESS);
    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.escrowTransaction.upsert).not.toHaveBeenCalled();
    expect(tx.walletLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('does not credit the platform escrow wallet twice for an existing escrow hold ledger entry', async () => {
    tx.walletLedgerEntry.findUnique.mockResolvedValue({
      id: 'ledger_one',
      walletId: 'platform_wallet_one',
      idempotencyKey: 'payment:payment_one:escrow-hold:order_item_one',
    });

    await service.verifyPayment('buyer_user', 'payment_one');

    expect(tx.escrowTransaction.upsert).toHaveBeenCalledTimes(1);
    expect(tx.wallet.update).not.toHaveBeenCalled();
    expect(tx.walletLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('rejects invalid webhook signatures', async () => {
    provider.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      service.handleWebhook(
        PaymentProvider.PAYSTACK,
        { event: 'charge.success' },
        'bad',
        Buffer.from('{}'),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('processes a valid successful webhook idempotently', async () => {
    prisma.payment.findUnique.mockResolvedValue(payment);

    await service.handleWebhook(
      PaymentProvider.PAYSTACK,
      {
        event: 'charge.success',
        data: {
          reference: 'paystack_ref_one',
          status: 'success',
          amount: 21000,
          currency: 'NGN',
        },
      },
      'valid-signature',
      Buffer.from('{}'),
    );

    expect(provider.verifyWebhookSignature).toHaveBeenCalledWith(
      expect.any(Object),
      'valid-signature',
      expect.any(Buffer),
    );
    expect(provider.verifyPayment).toHaveBeenCalledWith('paystack_ref_one');
    expect(prisma.payment.findUnique).toHaveBeenCalledWith({
      where: { providerReference: 'paystack_ref_one' },
      include: expect.any(Object),
    });
    expect(tx.escrowTransaction.upsert).toHaveBeenCalledTimes(1);
    expect(tx.walletLedgerEntry.create).toHaveBeenCalledTimes(1);
  });

  it('rejects provider success when amount does not match payment record', async () => {
    provider.verifyPayment.mockResolvedValue({
      status: 'success',
      providerReference: 'paystack_ref_one',
      amountKobo: BigInt(20000),
      currency: 'NGN',
    });

    await expect(
      service.verifyPayment('buyer_user', 'payment_one'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(tx.escrowTransaction.upsert).not.toHaveBeenCalled();
    expect(tx.walletLedgerEntry.create).not.toHaveBeenCalled();
  });
});
