/* eslint-disable @typescript-eslint/unbound-method */
import { PaymentProvider, UserRole } from '@prisma/client';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  const user = {
    sub: 'buyer_user',
    email: 'buyer@example.com',
    role: UserRole.BUYER,
  };

  it('delegates payment initiation, verification, and webhooks', async () => {
    const service = {
      initiatePayment: jest.fn().mockResolvedValue({ id: 'payment_one' }),
      verifyPayment: jest.fn().mockResolvedValue({ id: 'payment_one' }),
      handleWebhook: jest.fn().mockResolvedValue({ id: 'payment_one' }),
    } as unknown as jest.Mocked<PaymentsService>;
    const controller = new PaymentsController(service);

    await controller.initiatePayment(user, {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      provider: PaymentProvider.PAYSTACK,
    });
    await controller.verifyPayment(user, {
      paymentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    await controller.handleWebhook(
      { provider: PaymentProvider.PAYSTACK },
      { event: 'charge.success' },
      'signature',
      { rawBody: Buffer.from('{}') } as never,
    );

    expect(service.initiatePayment).toHaveBeenCalledWith('buyer_user', {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      provider: PaymentProvider.PAYSTACK,
    });
    expect(service.verifyPayment).toHaveBeenCalledWith(
      'buyer_user',
      '550e8400-e29b-41d4-a716-446655440000',
    );
    expect(service.handleWebhook).toHaveBeenCalledWith(
      PaymentProvider.PAYSTACK,
      { event: 'charge.success' },
      'signature',
      Buffer.from('{}'),
    );
  });
});
