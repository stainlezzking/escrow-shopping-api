/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { createHmac } from 'crypto';
import { PaystackPaymentProvider } from './paystack-payment.provider';

describe('PaystackPaymentProvider', () => {
  const paymentConfig = {
    provider: PaymentProvider.PAYSTACK,
    paystackSecretKey: 'paystack_test_secret',
    paystackBaseUrl: 'https://api.paystack.test',
  };

  const configService = {
    getOrThrow: jest.fn().mockReturnValue(paymentConfig),
  } as unknown as ConfigService;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('uses Paystack as the configured provider adapter', () => {
    const provider = new PaystackPaymentProvider(configService);

    expect(provider.provider).toBe(PaymentProvider.PAYSTACK);
  });

  it('initializes a Paystack transaction with metadata', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/auth',
          reference: 'paystack_ref_one',
        },
      }),
    });
    const provider = new PaystackPaymentProvider(configService);

    const result = await provider.initiatePayment({
      internalReference: 'PAY-20260703-ABC123',
      amountKobo: BigInt(21000),
      currency: 'NGN',
      orderId: 'order_one',
      orderReference: 'ORD-20260703-ABC123',
      buyerProfileId: 'buyer_profile_one',
      buyerEmail: 'buyer@example.com',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.paystack.test/transaction/initialize',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${paymentConfig.paystackSecretKey}`,
        }),
        body: JSON.stringify({
          email: 'buyer@example.com',
          amount: 21000,
          currency: 'NGN',
          metadata: {
            internalPaymentReference: 'PAY-20260703-ABC123',
            orderReference: 'ORD-20260703-ABC123',
            orderId: 'order_one',
            buyerProfileId: 'buyer_profile_one',
          },
        }),
      }),
    );
    expect(result.providerReference).toBe('paystack_ref_one');
    expect(result.authorizationUrl).toBe('https://checkout.paystack.com/auth');
  });

  it('verifies a Paystack transaction and normalizes the result', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: true,
        data: {
          status: 'success',
          reference: 'paystack_ref_one',
          amount: 21000,
          currency: 'NGN',
          gateway_response: 'Successful',
          channel: 'card',
          paid_at: '2026-07-03T10:00:00.000Z',
        },
      }),
    });
    const provider = new PaystackPaymentProvider(configService);

    const result = await provider.verifyPayment('paystack_ref_one');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.paystack.test/transaction/verify/paystack_ref_one',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        providerReference: 'paystack_ref_one',
        amountKobo: BigInt(21000),
        currency: 'NGN',
      }),
    );
  });

  it('verifies webhook signatures with the raw body and configured secret', () => {
    const provider = new PaystackPaymentProvider(configService);
    const payload = {
      event: 'charge.success',
      data: { reference: 'paystack_ref_one' },
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = createHmac('sha512', paymentConfig.paystackSecretKey)
      .update(rawBody)
      .digest('hex');

    expect(provider.verifyWebhookSignature(payload, signature, rawBody)).toBe(
      true,
    );
    expect(provider.verifyWebhookSignature(payload, 'bad', rawBody)).toBe(
      false,
    );
  });

  it('parses Paystack charge.success events', () => {
    const provider = new PaystackPaymentProvider(configService);

    expect(
      provider.parseWebhook({
        event: 'charge.success',
        data: {
          reference: 'paystack_ref_one',
          status: 'success',
          amount: 21000,
          currency: 'NGN',
        },
      }),
    ).toEqual(
      expect.objectContaining({
        providerReference: 'paystack_ref_one',
        status: 'success',
        amountKobo: BigInt(21000),
        currency: 'NGN',
      }),
    );
  });
});
