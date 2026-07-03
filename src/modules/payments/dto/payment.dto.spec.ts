import { PaymentProvider } from '@prisma/client';
import { InitiatePaymentSchema, PaymentWebhookSchema } from './payment.dto';

describe('payment DTO schemas', () => {
  it('accepts payment initiation from an order ID and provider', () => {
    const parsed = InitiatePaymentSchema.parse({
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      provider: PaymentProvider.PAYSTACK,
    });

    expect(parsed.provider).toBe(PaymentProvider.PAYSTACK);
  });

  it('rejects invalid provider values', () => {
    expect(() =>
      InitiatePaymentSchema.parse({
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        provider: 'FRONTEND_CONFIRMED',
      }),
    ).toThrow();
  });

  it('accepts arbitrary webhook payload records', () => {
    expect(
      PaymentWebhookSchema.parse({
        event: 'charge.success',
        data: { reference: 'paystack_ref_one' },
      }),
    ).toEqual({
      event: 'charge.success',
      data: { reference: 'paystack_ref_one' },
    });
  });
});
