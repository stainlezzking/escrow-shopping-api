/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AccountStatus,
  EscrowStatus,
  KycStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  StoreStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  const buyerProfile = {
    id: 'buyer_profile_one',
    userId: 'buyer_user',
    fullName: 'Ada Buyer',
    phoneNumber: null,
    status: AccountStatus.ACTIVE,
    createdAt: new Date('2026-06-23T09:00:00.000Z'),
    updatedAt: new Date('2026-06-23T09:00:00.000Z'),
  };

  const product = {
    id: 'product_one',
    sellerProfileId: 'store_one',
    title: 'Phone',
    slug: 'phone',
    description: null,
    priceKobo: BigInt(10000),
    stockQuantity: 5,
    status: ProductStatus.LIVE,
    viewCount: 0,
    isActive: true,
    createdAt: new Date('2026-06-23T09:00:00.000Z'),
    updatedAt: new Date('2026-06-23T09:00:00.000Z'),
    deletedAt: null,
    sellerProfile: {
      id: 'store_one',
      businessName: 'Tech Store',
      storeHandle: 'tech-store',
      kycStatus: KycStatus.VERIFIED,
      status: StoreStatus.ACTIVE,
    },
  };

  const createdOrder = {
    id: 'order_one',
    buyerProfileId: 'buyer_profile_one',
    orderReference: 'ORD-20260623-ABC123',
    status: OrderStatus.PENDING_PAYMENT,
    totalProductAmountKobo: BigInt(20000),
    totalShippingFeeKobo: BigInt(0),
    totalServiceFeeKobo: BigInt(1000),
    totalOrderAmountKobo: BigInt(21000),
    cancelledAt: null,
    completedAt: null,
    createdAt: new Date('2026-06-23T09:01:00.000Z'),
    updatedAt: new Date('2026-06-23T09:01:00.000Z'),
    items: [
      {
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
        createdAt: new Date('2026-06-23T09:01:00.000Z'),
        updatedAt: new Date('2026-06-23T09:01:00.000Z'),
        product,
      },
    ],
  };

  let tx: {
    order: { create: jest.Mock; updateMany: jest.Mock };
    orderItem: { findFirst: jest.Mock; update: jest.Mock };
    dispatchEvidence: { create: jest.Mock };
    platformSetting: { findUnique: jest.Mock };
  };
  let prisma: jest.Mocked<PrismaService>;
  let escrowService: jest.Mocked<EscrowService>;
  let service: OrdersService;

  beforeEach(() => {
    tx = {
      order: {
        create: jest.fn().mockResolvedValue(createdOrder),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderItem: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      dispatchEvidence: {
        create: jest.fn(),
      },
      platformSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    prisma = {
      buyerProfile: {
        findUnique: jest.fn().mockResolvedValue(buyerProfile),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([product]),
      },
      order: {
        create: jest.fn(),
      },
      orderItem: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as jest.Mocked<PrismaService>;

    escrowService = {
      releaseEscrowToSeller: jest.fn().mockResolvedValue({
        orderId: 'order_one',
        orderItemId: 'order_item_one',
        escrowId: 'escrow_one',
        orderItemStatus: OrderItemStatus.RELEASED,
        escrowStatus: EscrowStatus.RELEASED,
        sellerNetAmountKobo: '20000',
        platformFeeKobo: '1000',
        confirmedAt: new Date('2026-06-29T10:00:00.000Z'),
        releasedAt: new Date('2026-06-29T10:00:00.000Z'),
      }),
    } as unknown as jest.Mocked<EscrowService>;

    service = new OrdersService(prisma, escrowService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes a pending payment order from client-provided items without reading cart items', async () => {
    const result = await service.initializeOrder('buyer_user', {
      items: [{ productId: 'product_one', quantity: 2 }],
    });

    expect(prisma.buyerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'buyer_user' },
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['product_one'] } },
      include: { sellerProfile: true },
    });
    expect(tx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buyerProfileId: 'buyer_profile_one',
        status: OrderStatus.PENDING_PAYMENT,
        totalProductAmountKobo: BigInt(20000),
        totalShippingFeeKobo: BigInt(0),
        totalServiceFeeKobo: BigInt(1000),
        totalOrderAmountKobo: BigInt(21000),
        items: {
          create: [
            expect.objectContaining({
              productId: 'product_one',
              sellerProfileId: 'store_one',
              quantity: 2,
              unitPriceAtCheckoutKobo: BigInt(10000),
              productAmountKobo: BigInt(20000),
              shippingFeeKobo: BigInt(0),
              serviceFeeKobo: BigInt(1000),
              netEscrowAmountKobo: BigInt(20000),
              status: OrderItemStatus.PENDING_PAYMENT,
            }),
          ],
        },
      }),
      include: expect.any(Object),
    });
    expect(result.status).toBe(OrderStatus.PENDING_PAYMENT);
    expect(result.totalOrderAmountKobo).toBe('21000');
    expect(result.items[0].serviceFeeKobo).toBe('1000');
  });

  it('rejects checkout when the buyer profile does not exist', async () => {
    prisma.buyerProfile.findUnique.mockResolvedValue(null);

    await expect(
      service.initializeOrder('missing_user', {
        items: [{ productId: 'product_one', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects missing, hidden, inactive, or unverified seller products', async () => {
    prisma.product.findMany.mockResolvedValue([]);

    await expect(
      service.initializeOrder('buyer_user', {
        items: [{ productId: 'missing_product', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects products with insufficient stock', async () => {
    await expect(
      service.initializeOrder('buyer_user', {
        items: [{ productId: 'product_one', quantity: 6 }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('stores seller dispatch evidence and starts the safety timer', async () => {
    const now = new Date('2026-06-24T10:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const evidence = {
      id: 'dispatch_evidence_one',
      orderItemId: 'order_item_one',
      sellerProfileId: 'store_one',
      evidenceType: 'courier_receipt',
      imageUrl: null,
      storageKey: 'dispatch/store-one/order-item-one.jpg',
      trackingReference: 'TRK-001',
      courierName: 'GIG Logistics',
      notes: null,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    tx.orderItem.findFirst.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      sellerProfileId: 'store_one',
      status: OrderItemStatus.AWAITING_DISPATCH,
      sellerProfile: {
        id: 'store_one',
        userId: 'seller_user',
      },
      escrow: {
        id: 'escrow_one',
        status: EscrowStatus.HELD,
      },
      order: {
        id: 'order_one',
        payments: [{ id: 'payment_one', status: PaymentStatus.SUCCESS }],
      },
    });
    tx.dispatchEvidence.create.mockResolvedValue(evidence);
    tx.orderItem.update.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      status: OrderItemStatus.DISPATCHED,
      dispatchedAt: now,
      safetyTimerExpiresAt: new Date('2026-06-29T10:00:00.000Z'),
    });

    const result = await service.dispatchOrderItem(
      'seller_user',
      'order_one',
      'order_item_one',
      {
        evidenceType: 'courier_receipt',
        storageKey: 'dispatch/store-one/order-item-one.jpg',
        trackingReference: 'TRK-001',
        courierName: 'GIG Logistics',
      },
    );

    expect(tx.orderItem.findFirst).toHaveBeenCalledWith({
      where: { id: 'order_item_one', orderId: 'order_one' },
      include: expect.any(Object),
    });
    expect(tx.dispatchEvidence.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderItemId: 'order_item_one',
        sellerProfileId: 'store_one',
        storageKey: 'dispatch/store-one/order-item-one.jpg',
        trackingReference: 'TRK-001',
      }),
    });
    expect(tx.orderItem.update).toHaveBeenCalledWith({
      where: { id: 'order_item_one' },
      data: {
        status: OrderItemStatus.DISPATCHED,
        dispatchedAt: expect.any(Date),
        safetyTimerExpiresAt: new Date('2026-06-29T10:00:00.000Z'),
      },
    });
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order_one', status: OrderStatus.PAID },
      data: { status: OrderStatus.PARTIALLY_FULFILLED },
    });
    expect(result.status).toBe(OrderItemStatus.DISPATCHED);
    expect(result.evidence.id).toBe('dispatch_evidence_one');
  });

  it('rejects dispatch when the order item is missing', async () => {
    tx.orderItem.findFirst.mockResolvedValue(null);

    await expect(
      service.dispatchOrderItem('seller_user', 'order_one', 'missing_item', {
        trackingReference: 'TRK-001',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects dispatch by a seller that does not own the item', async () => {
    tx.orderItem.findFirst.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      sellerProfileId: 'store_one',
      status: OrderItemStatus.AWAITING_DISPATCH,
      sellerProfile: {
        id: 'store_one',
        userId: 'seller_user',
      },
      escrow: {
        id: 'escrow_one',
        status: EscrowStatus.HELD,
      },
      order: {
        payments: [{ id: 'payment_one', status: PaymentStatus.SUCCESS }],
      },
    });

    await expect(
      service.dispatchOrderItem('other_seller', 'order_one', 'order_item_one', {
        trackingReference: 'TRK-001',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.dispatchEvidence.create).not.toHaveBeenCalled();
  });

  it('rejects dispatch when item status is not awaiting dispatch', async () => {
    tx.orderItem.findFirst.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      sellerProfileId: 'store_one',
      status: OrderItemStatus.PENDING_PAYMENT,
      sellerProfile: {
        id: 'store_one',
        userId: 'seller_user',
      },
      escrow: {
        id: 'escrow_one',
        status: EscrowStatus.HELD,
      },
      order: {
        payments: [{ id: 'payment_one', status: PaymentStatus.SUCCESS }],
      },
    });

    await expect(
      service.dispatchOrderItem('seller_user', 'order_one', 'order_item_one', {
        trackingReference: 'TRK-001',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects dispatch when payment has not been verified', async () => {
    tx.orderItem.findFirst.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      sellerProfileId: 'store_one',
      status: OrderItemStatus.AWAITING_DISPATCH,
      sellerProfile: {
        id: 'store_one',
        userId: 'seller_user',
      },
      escrow: {
        id: 'escrow_one',
        status: EscrowStatus.HELD,
      },
      order: {
        payments: [],
      },
    });

    await expect(
      service.dispatchOrderItem('seller_user', 'order_one', 'order_item_one', {
        trackingReference: 'TRK-001',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects dispatch when escrow is not held', async () => {
    tx.orderItem.findFirst.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      sellerProfileId: 'store_one',
      status: OrderItemStatus.AWAITING_DISPATCH,
      sellerProfile: {
        id: 'store_one',
        userId: 'seller_user',
      },
      escrow: {
        id: 'escrow_one',
        status: EscrowStatus.FUNDED,
      },
      order: {
        payments: [{ id: 'payment_one', status: PaymentStatus.SUCCESS }],
      },
    });

    await expect(
      service.dispatchOrderItem('seller_user', 'order_one', 'order_item_one', {
        trackingReference: 'TRK-001',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('confirms buyer-owned dispatched order item and triggers escrow release', async () => {
    prisma.orderItem.findFirst.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      sellerProfileId: 'store_one',
      status: OrderItemStatus.DISPATCHED,
      escrow: {
        id: 'escrow_one',
        status: EscrowStatus.HELD,
        releasedAt: null,
        refundedAt: null,
      },
      order: {
        id: 'order_one',
        buyerProfile: { id: 'buyer_profile_one', userId: 'buyer_user' },
      },
      disputes: [],
    });

    const result = await service.confirmOrderItemDelivery(
      'buyer_user',
      'order_one',
      'order_item_one',
    );

    expect(prisma.orderItem.findFirst).toHaveBeenCalledWith({
      where: { id: 'order_item_one', orderId: 'order_one' },
      include: expect.any(Object),
    });
    expect(escrowService.releaseEscrowToSeller).toHaveBeenCalledWith({
      orderItemId: 'order_item_one',
      reason: 'BUYER_CONFIRMATION',
      requireBuyerConfirmationState: true,
    });
    expect(result.orderItemStatus).toBe(OrderItemStatus.RELEASED);
    expect(result.escrowStatus).toBe(EscrowStatus.RELEASED);
  });

  it('rejects buyer confirmation for an order item owned by another buyer', async () => {
    prisma.orderItem.findFirst.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      status: OrderItemStatus.DISPATCHED,
      escrow: {
        id: 'escrow_one',
        status: EscrowStatus.HELD,
        releasedAt: null,
        refundedAt: null,
      },
      order: {
        buyerProfile: { id: 'buyer_profile_one', userId: 'other_buyer' },
      },
      disputes: [],
    });

    await expect(
      service.confirmOrderItemDelivery(
        'buyer_user',
        'order_one',
        'order_item_one',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(escrowService.releaseEscrowToSeller).not.toHaveBeenCalled();
  });

  it('rejects buyer confirmation when item is not dispatched or delivered', async () => {
    prisma.orderItem.findFirst.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      status: OrderItemStatus.AWAITING_DISPATCH,
      escrow: {
        id: 'escrow_one',
        status: EscrowStatus.HELD,
        releasedAt: null,
        refundedAt: null,
      },
      order: {
        buyerProfile: { id: 'buyer_profile_one', userId: 'buyer_user' },
      },
      disputes: [],
    });

    await expect(
      service.confirmOrderItemDelivery(
        'buyer_user',
        'order_one',
        'order_item_one',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(escrowService.releaseEscrowToSeller).not.toHaveBeenCalled();
  });

  it('rejects buyer confirmation for released, refunded, or disputed items', async () => {
    for (const status of [
      OrderItemStatus.DISPUTED,
      OrderItemStatus.RELEASED,
      OrderItemStatus.REFUNDED,
    ]) {
      prisma.orderItem.findFirst.mockResolvedValueOnce({
        id: 'order_item_one',
        orderId: 'order_one',
        status,
        escrow: {
          id: 'escrow_one',
          status: EscrowStatus.HELD,
          releasedAt: null,
          refundedAt: null,
        },
        order: {
          buyerProfile: { id: 'buyer_profile_one', userId: 'buyer_user' },
        },
        disputes: [],
      });

      await expect(
        service.confirmOrderItemDelivery(
          'buyer_user',
          'order_one',
          'order_item_one',
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    }

    expect(escrowService.releaseEscrowToSeller).not.toHaveBeenCalled();
  });

  it('rejects buyer confirmation when escrow is not held', async () => {
    prisma.orderItem.findFirst.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      status: OrderItemStatus.DISPATCHED,
      escrow: {
        id: 'escrow_one',
        status: EscrowStatus.RELEASED,
        releasedAt: new Date('2026-06-29T10:00:00.000Z'),
        refundedAt: null,
      },
      order: {
        buyerProfile: { id: 'buyer_profile_one', userId: 'buyer_user' },
      },
      disputes: [],
    });

    await expect(
      service.confirmOrderItemDelivery(
        'buyer_user',
        'order_one',
        'order_item_one',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(escrowService.releaseEscrowToSeller).not.toHaveBeenCalled();
  });

  it('rejects buyer confirmation when an active dispute exists', async () => {
    prisma.orderItem.findFirst.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      status: OrderItemStatus.DISPATCHED,
      escrow: {
        id: 'escrow_one',
        status: EscrowStatus.HELD,
        releasedAt: null,
        refundedAt: null,
      },
      order: {
        buyerProfile: { id: 'buyer_profile_one', userId: 'buyer_user' },
      },
      disputes: [{ id: 'dispute_one' }],
    });

    await expect(
      service.confirmOrderItemDelivery(
        'buyer_user',
        'order_one',
        'order_item_one',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(escrowService.releaseEscrowToSeller).not.toHaveBeenCalled();
  });
});
