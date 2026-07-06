/* eslint-disable @typescript-eslint/unbound-method */
import { EscrowStatus, OrderItemStatus, UserRole } from '@prisma/client';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  const service = {
    initializeOrder: jest.fn(),
    dispatchOrderItem: jest.fn(),
    confirmOrderItemDelivery: jest.fn(),
  } as unknown as jest.Mocked<OrdersService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates order initialization to the service', async () => {
    service.initializeOrder.mockResolvedValue({ id: 'order_one' });
    const controller = new OrdersController(service);

    await controller.initializeOrder(
      {
        sub: 'buyer_user',
        email: 'buyer@example.com',
        role: UserRole.BUYER,
      },
      {
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440000',
            quantity: 2,
            deliveryQuoteId: '650e8400-e29b-41d4-a716-446655440000',
          },
        ],
      },
    );

    expect(service.initializeOrder).toHaveBeenCalledWith('buyer_user', {
      items: [
        {
          productId: '550e8400-e29b-41d4-a716-446655440000',
          quantity: 2,
          deliveryQuoteId: '650e8400-e29b-41d4-a716-446655440000',
        },
      ],
    });
  });

  it('delegates seller dispatch to the service', async () => {
    const dispatchedAt = new Date('2026-06-24T10:00:00.000Z');
    service.dispatchOrderItem.mockResolvedValue({
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      orderItemId: '650e8400-e29b-41d4-a716-446655440000',
      status: OrderItemStatus.DISPATCHED,
      dispatchedAt,
      safetyTimerExpiresAt: new Date('2026-06-29T10:00:00.000Z'),
      evidence: {
        id: '750e8400-e29b-41d4-a716-446655440000',
        evidenceType: null,
        imageUrl: null,
        storageKey: null,
        trackingReference: 'TRK-001',
        courierName: null,
        notes: null,
        uploadedAt: dispatchedAt,
      },
    });
    const controller = new OrdersController(service);

    await controller.dispatchOrderItem(
      {
        sub: 'seller_user',
        email: 'seller@example.com',
        role: UserRole.SELLER,
      },
      {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        itemId: '650e8400-e29b-41d4-a716-446655440000',
      },
      {
        trackingReference: 'TRK-001',
      },
    );

    expect(service.dispatchOrderItem).toHaveBeenCalledWith(
      'seller_user',
      '550e8400-e29b-41d4-a716-446655440000',
      '650e8400-e29b-41d4-a716-446655440000',
      {
        trackingReference: 'TRK-001',
      },
    );
  });

  it('delegates buyer delivery confirmation to the service', async () => {
    const releasedAt = new Date('2026-06-29T10:00:00.000Z');
    service.confirmOrderItemDelivery.mockResolvedValue({
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      orderItemId: '650e8400-e29b-41d4-a716-446655440000',
      escrowId: '750e8400-e29b-41d4-a716-446655440000',
      orderItemStatus: OrderItemStatus.RELEASED,
      escrowStatus: EscrowStatus.RELEASED,
      sellerNetAmountKobo: '20000',
      platformFeeKobo: '1000',
      confirmedAt: releasedAt,
      releasedAt,
    });
    const controller = new OrdersController(service);

    await controller.confirmOrderItemDelivery(
      {
        sub: 'buyer_user',
        email: 'buyer@example.com',
        role: UserRole.BUYER,
      },
      {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        itemId: '650e8400-e29b-41d4-a716-446655440000',
      },
    );

    expect(service.confirmOrderItemDelivery).toHaveBeenCalledWith(
      'buyer_user',
      '550e8400-e29b-41d4-a716-446655440000',
      '650e8400-e29b-41d4-a716-446655440000',
    );
  });
});
