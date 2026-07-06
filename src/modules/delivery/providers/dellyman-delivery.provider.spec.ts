import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { DellymanDeliveryProvider } from './dellyman-delivery.provider';

describe('DellymanDeliveryProvider', () => {
  let provider: DellymanDeliveryProvider;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
    global.fetch = fetchMock;

    provider = new DellymanDeliveryProvider({
      getOrThrow: jest.fn().mockReturnValue({
        dellymanBaseUrl: 'https://dev.dellyman.test/api/v3.0',
        dellymanApiKey: 'dellyman_api_key',
        dellymanWebhookSecret: 'webhook_secret',
        defaultPickupWindow: '08:00 AM to 05:00 PM',
      }),
    } as unknown as ConfigService);
  });

  it('requests Dellyman quotes and maps the selected company amount to kobo', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        ResponseCode: 100,
        Companies: [
          {
            CompanyID: 643,
            Name: 'Delly Logistics Africa Ltd',
            PayableAmount: 1584,
          },
        ],
      }),
    });

    const result = await provider.getQuote({
      pickupAddress: '12 Admiralty Way, Lekki, Lagos',
      dropoffAddress: '25 Bode Thomas Street, Surulere, Lagos',
      dropoffState: 'Lagos',
      packageDescription: 'Phone',
      quantity: 1,
      vehicle: 'Bike',
    });

    const [url, requestInit] = fetchMock.mock.calls[0];
    const headers = requestInit?.headers as Record<string, string>;
    const body = typeof requestInit?.body === 'string' ? requestInit.body : '';

    expect(url).toBe('https://dev.dellyman.test/api/v3.0/GetQuotes');
    expect(requestInit?.method).toBe('POST');
    expect(headers.Authorization).toBe('Bearer dellyman_api_key');
    expect(body).toContain('"PaymentMode":"online"');
    expect(result.amountKobo).toBe(BigInt(158400));
    expect(result.providerCompanyId).toBe('643');
  });

  it('verifies Dellyman webhook signatures with HMAC-SHA256 raw body', () => {
    const payload = { order: { OrderID: '88601' } };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = createHmac('sha256', 'webhook_secret')
      .update(rawBody)
      .digest('hex');

    expect(provider.verifyWebhookSignature(payload, signature, rawBody)).toBe(
      true,
    );
    expect(provider.verifyWebhookSignature(payload, 'bad', rawBody)).toBe(
      false,
    );
  });
});
