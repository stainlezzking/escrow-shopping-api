/* eslint-disable @typescript-eslint/unbound-method */
import { UserRole } from '@prisma/client';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  it('delegates order initialization to the service', async () => {
    const service = {
      initializeOrder: jest.fn().mockResolvedValue({ id: 'order_one' }),
    } as unknown as jest.Mocked<OrdersService>;
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
          },
        ],
      },
    );

    expect(service.initializeOrder).toHaveBeenCalledWith('buyer_user', {
      items: [
        {
          productId: '550e8400-e29b-41d4-a716-446655440000',
          quantity: 2,
        },
      ],
    });
  });
});
