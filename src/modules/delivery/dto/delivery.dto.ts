import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * Validates city-list query params.
 */
export const DeliveryCitiesQuerySchema = z.object({
  stateId: z.string().trim().min(1).max(80),
});

/**
 * Validates delivery quote requests before checkout.
 */
export const CreateDeliveryQuoteSchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
  deliveryAddressId: z.uuid(),
  vehicle: z.string().trim().min(1).max(80).optional(),
  packageWeightKg: z.coerce.number().positive().max(100).optional(),
});

/**
 * Validates order item route params used by delivery endpoints.
 */
export const DeliveryOrderItemParamsSchema = z.object({
  orderItemId: z.uuid(),
});

/**
 * Validates delivery tracking params.
 */
export const DeliveryTrackingParamsSchema = z.object({
  shipmentId: z.uuid(),
});

/**
 * Accepts provider webhook payloads for provider-specific normalization.
 */
export const DeliveryWebhookSchema = z.record(z.string(), z.unknown());

export type DeliveryCitiesQueryInput = z.infer<
  typeof DeliveryCitiesQuerySchema
>;
export type CreateDeliveryQuoteInput = z.infer<
  typeof CreateDeliveryQuoteSchema
>;
export type DeliveryOrderItemParamsInput = z.infer<
  typeof DeliveryOrderItemParamsSchema
>;
export type DeliveryTrackingParamsInput = z.infer<
  typeof DeliveryTrackingParamsSchema
>;
export type DeliveryWebhookInput = z.infer<typeof DeliveryWebhookSchema>;

/**
 * Query params for city selection.
 */
export class DeliveryCitiesQueryDto {
  @ApiProperty({ example: '25', description: 'Provider state identifier.' })
  stateId: string;
}

/**
 * Request body for getting and storing a provider delivery quote.
 */
export class CreateDeliveryQuoteDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  productId: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 99 })
  quantity: number;

  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440000' })
  deliveryAddressId: string;

  @ApiPropertyOptional({ example: 'Bike' })
  vehicle?: string;

  @ApiPropertyOptional({ example: 2.5 })
  packageWeightKg?: number;
}
