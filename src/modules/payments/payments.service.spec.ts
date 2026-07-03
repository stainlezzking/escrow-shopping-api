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
  OrderItemStatus,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
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

  let tx: {
    payment: { update: jest.Mock };
    order: { update: jest.Mock };
    orderItem: { updateMany: jest.Mock };
    escrowTransaction: { createMany: jest.Mock };
  };
  let prisma: jest.Mocked<PrismaService>;
  let provider: jest.Mocked<PaymentProviderPort>;
  let service: PaymentsService;

  beforeEach(() => {
    tx = {
      payment: {
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
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
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
    expect(tx.escrowTransaction.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          orderItemId: 'order_item_one',
          sellerProfileId: 'store_one',
          buyerProfileId: 'buyer_profile_one',
          paymentId: 'payment_one',
          status: EscrowStatus.HELD,
          grossAmountKobo: BigInt(21000),
          sellerNetAmountKobo: BigInt(20000),
          platformFeeKobo: BigInt(1000),
        }),
      ],
      skipDuplicates: true,
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
    expect(tx.escrowTransaction.createMany).not.toHaveBeenCalled();
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
    expect(tx.escrowTransaction.createMany).toHaveBeenCalledTimes(1);
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

    expect(tx.escrowTransaction.createMany).not.toHaveBeenCalled();
  });
});
