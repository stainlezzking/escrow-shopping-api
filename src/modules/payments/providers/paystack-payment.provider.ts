import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import type {
  InitiateProviderPaymentInput,
  InitiateProviderPaymentResult,
  PaymentProviderPort,
  PaymentWebhookEvent,
  ProviderPaymentStatus,
  VerifyProviderPaymentResult,
} from './payment-provider.interface';

interface PaymentConfig {
  paystackSecretKey: string;
  paystackBaseUrl: string;
}

const PaystackInitializeResponseSchema = z.object({
  status: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    authorization_url: z.string().url(),
    reference: z.string().min(1),
  }),
});

const PaystackVerifyResponseSchema = z.object({
  status: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    status: z.string(),
    reference: z.string().min(1),
    amount: z.number().int().nonnegative(),
    currency: z.string().min(1),
    gateway_response: z.string().optional().nullable(),
    channel: z.string().optional().nullable(),
    paid_at: z.string().optional().nullable(),
  }),
});

/**
 * Paystack payment adapter for payment initialization, verification, and
 * webhook normalization.
 */
@Injectable()
export class PaystackPaymentProvider implements PaymentProviderPort {
  constructor(private readonly configService: ConfigService) {}

  get provider(): PaymentProvider {
    return PaymentProvider.PAYSTACK;
  }

  /**
   * Initializes a Paystack transaction with Escrova payment metadata.
   *
   * @param input - Provider-neutral payment initialization details.
   * @returns Paystack authorization URL and transaction reference.
   */
  async initiatePayment(
    input: InitiateProviderPaymentInput,
  ): Promise<InitiateProviderPaymentResult> {
    const config = this.getConfig();
    const response = await fetch(
      `${config.paystackBaseUrl}/transaction/initialize`,
      {
        method: 'POST',
        headers: this.buildHeaders(config.paystackSecretKey),
        body: JSON.stringify({
          email: input.buyerEmail,
          amount: this.toSafeNumber(input.amountKobo),
          currency: input.currency,
          metadata: {
            internalPaymentReference: input.internalReference,
            orderReference: input.orderReference,
            orderId: input.orderId,
            buyerProfileId: input.buyerProfileId,
          },
        }),
      },
    );
    const payload = await this.parseJson(response);
    const parsed = PaystackInitializeResponseSchema.safeParse(payload);

    if (!response.ok || !parsed.success || !parsed.data.status) {
      throw new InternalServerErrorException(
        'Unable to initialize payment with provider',
      );
    }

    return {
      authorizationUrl: parsed.data.data.authorization_url,
      providerReference: parsed.data.data.reference,
      providerPayload: {
        provider: this.provider,
        providerStatus: 'initialized',
      },
    };
  }

  /**
   * Verifies a Paystack transaction from Paystack's server-side API.
   *
   * @param providerReference - Paystack transaction reference to verify.
   * @returns Provider-neutral verification result.
   */
  async verifyPayment(
    providerReference: string,
  ): Promise<VerifyProviderPaymentResult> {
    const config = this.getConfig();
    const response = await fetch(
      `${config.paystackBaseUrl}/transaction/verify/${encodeURIComponent(
        providerReference,
      )}`,
      {
        method: 'GET',
        headers: this.buildHeaders(config.paystackSecretKey),
      },
    );
    const payload = await this.parseJson(response);
    const parsed = PaystackVerifyResponseSchema.safeParse(payload);

    if (!response.ok || !parsed.success || !parsed.data.status) {
      throw new InternalServerErrorException(
        'Unable to verify payment with provider',
      );
    }

    const data = parsed.data.data;

    return {
      status: this.mapPaystackStatus(data.status),
      providerReference: data.reference,
      amountKobo: BigInt(data.amount),
      currency: data.currency,
      providerPayload: {
        providerStatus: data.status,
        gatewayResponse: data.gateway_response ?? null,
        channel: data.channel ?? null,
        paidAt: data.paid_at ?? null,
      },
    };
  }

  /**
   * Verifies Paystack webhook signature using the raw request body.
   *
   * @param payload - Parsed webhook payload.
   * @param signature - Paystack signature header value.
   * @param rawBody - Raw request body captured by Nest.
   * @returns True when the Paystack signature matches.
   */
  verifyWebhookSignature(
    _payload: unknown,
    signature: string,
    rawBody?: Buffer | string,
  ): boolean {
    const { paystackSecretKey } = this.getConfig();

    if (!paystackSecretKey || !signature || !rawBody) {
      return false;
    }

    const expected = createHmac('sha512', paystackSecretKey)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  /**
   * Parses Paystack webhook payloads into provider-neutral events.
   *
   * @param payload - Parsed webhook payload.
   * @returns Normalized webhook event.
   */
  parseWebhook(payload: unknown): PaymentWebhookEvent {
    const record = payload as Record<string, unknown>;
    const data =
      record.data && typeof record.data === 'object'
        ? (record.data as Record<string, unknown>)
        : {};
    const providerReference =
      typeof data.reference === 'string' ? data.reference : '';
    const providerStatus = typeof data.status === 'string' ? data.status : '';
    const amount =
      typeof data.amount === 'number' ? BigInt(data.amount) : undefined;
    const currency =
      typeof data.currency === 'string' ? data.currency : undefined;
    const status =
      record.event === 'charge.success' && providerStatus === 'success'
        ? 'success'
        : this.mapPaystackStatus(providerStatus);

    return {
      providerReference,
      status,
      amountKobo: amount,
      currency,
      providerPayload: {
        event: typeof record.event === 'string' ? record.event : null,
        providerStatus,
      },
    };
  }

  private getConfig(): PaymentConfig {
    return this.configService.getOrThrow<PaymentConfig>('payment');
  }

  private buildHeaders(secretKey: string): Record<string, string> {
    return {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async parseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new InternalServerErrorException(
        'Invalid payment provider response',
      );
    }
  }

  private mapPaystackStatus(status: string): ProviderPaymentStatus {
    if (status === 'success') {
      return 'success';
    }

    if (['failed', 'abandoned', 'reversed'].includes(status)) {
      return 'failed';
    }

    return 'pending';
  }

  private toSafeNumber(amountKobo: bigint): number {
    if (amountKobo > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new InternalServerErrorException('Payment amount is too large');
    }

    return Number(amountKobo);
  }
}
