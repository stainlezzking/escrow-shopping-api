import { ApiProperty } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import { z } from 'zod';

const providerValues = [PaymentProvider.PAYSTACK] as const;

/**
 * Validates payment initiation requests.
 */
export const InitiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.enum(providerValues),
});

/**
 * Validates payment route parameters.
 */
export const PaymentParamsSchema = z.object({
  paymentId: z.string().uuid(),
});

/**
 * Validates payment webhook provider route parameters.
 */
export const PaymentWebhookParamsSchema = z.object({
  provider: z.enum(providerValues),
});

/**
 * Accepts provider webhook payloads for provider-specific parsing.
 */
export const PaymentWebhookSchema = z.record(z.string(), z.unknown());

export type InitiatePaymentInput = z.infer<typeof InitiatePaymentSchema>;
export type PaymentParamsInput = z.infer<typeof PaymentParamsSchema>;
export type PaymentWebhookParamsInput = z.infer<
  typeof PaymentWebhookParamsSchema
>;
export type PaymentWebhookInput = z.infer<typeof PaymentWebhookSchema>;

/**
 * Request body for starting payment from a backend-created order.
 */
export class InitiatePaymentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Backend-created pending-payment order ID.',
  })
  orderId: string;

  @ApiProperty({
    enum: PaymentProvider,
    example: PaymentProvider.PAYSTACK,
    description: 'Configured payment provider to use for this attempt.',
  })
  provider: PaymentProvider;
}
