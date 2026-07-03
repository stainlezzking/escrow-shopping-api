import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { PaymentResponseDto } from './dto/payment-response.dto';

interface PaymentLike {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  internalReference: string;
  providerReference?: string | null;
  amountKobo: bigint;
  currency: string;
  verifiedAt?: Date | null;
  failedAt?: Date | null;
}

/**
 * Maps payment persistence records to client-safe responses.
 *
 * @param payment - Payment record without raw provider payload.
 * @param authorizationUrl - Optional provider checkout URL for initiation.
 * @returns Public-safe payment response.
 */
export function mapPayment(
  payment: PaymentLike,
  authorizationUrl?: string,
): PaymentResponseDto {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    status: payment.status,
    internalReference: payment.internalReference,
    providerReference: payment.providerReference ?? null,
    amountKobo: payment.amountKobo.toString(),
    currency: payment.currency,
    authorizationUrl,
    verifiedAt: payment.verifiedAt ?? null,
    failedAt: payment.failedAt ?? null,
  };
}
