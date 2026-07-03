import { PaymentProvider } from '@prisma/client';

export const PAYMENT_PROVIDER_PORT = Symbol('PAYMENT_PROVIDER_PORT');

/**
 * Provider-neutral payment status returned by payment adapters.
 */
export type ProviderPaymentStatus = 'success' | 'failed' | 'pending';

/**
 * Input for initializing a provider payment attempt.
 */
export interface InitiateProviderPaymentInput {
  internalReference: string;
  amountKobo: bigint;
  currency: string;
  orderId: string;
  orderReference: string;
  buyerProfileId: string;
  buyerEmail: string;
}

/**
 * Provider payment initialization response.
 */
export interface InitiateProviderPaymentResult {
  authorizationUrl: string;
  providerReference?: string;
  providerPayload?: Record<string, unknown>;
}

/**
 * Provider verification response.
 */
export interface VerifyProviderPaymentResult {
  status: ProviderPaymentStatus;
  providerReference: string;
  amountKobo?: bigint;
  currency?: string;
  providerPayload?: Record<string, unknown>;
}

/**
 * Normalized provider webhook event.
 */
export interface PaymentWebhookEvent {
  providerReference: string;
  status: ProviderPaymentStatus;
  amountKobo?: bigint;
  currency?: string;
  providerPayload?: Record<string, unknown>;
}

/**
 * Contract that all configured payment provider adapters must implement.
 */
export interface PaymentProviderPort {
  readonly provider: PaymentProvider;

  /**
   * Creates a provider-side payment attempt.
   *
   * @param input - Provider-neutral payment initialization details.
   * @returns Provider authorization details safe for the client.
   */
  initiatePayment(
    input: InitiateProviderPaymentInput,
  ): Promise<InitiateProviderPaymentResult>;

  /**
   * Verifies payment status directly with the provider.
   *
   * @param providerReference - Provider or internal reference to verify.
   * @returns Provider-neutral payment verification result.
   */
  verifyPayment(
    providerReference: string,
  ): Promise<VerifyProviderPaymentResult>;

  /**
   * Verifies webhook authenticity before processing.
   *
   * @param payload - Parsed provider webhook payload.
   * @param signature - Provider signature header value.
   * @returns True when the webhook is authentic.
   */
  verifyWebhookSignature(
    payload: unknown,
    signature: string,
    rawBody?: Buffer | string,
  ): boolean;

  /**
   * Converts a provider webhook payload into a normalized event.
   *
   * @param payload - Parsed provider webhook payload.
   * @returns Normalized payment webhook event.
   */
  parseWebhook(payload: unknown): PaymentWebhookEvent;
}
