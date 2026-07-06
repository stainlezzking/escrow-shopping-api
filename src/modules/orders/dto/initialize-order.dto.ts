import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * Validates one product line sent by the client during checkout.
 */
export const InitializeOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
  deliveryQuoteId: z.string().uuid(),
});

/**
 * Validates order initialization payloads.
 */
export const InitializeOrderSchema = z.object({
  items: z.array(InitializeOrderItemSchema).min(1).max(50),
});

export type InitializeOrderInput = z.infer<typeof InitializeOrderSchema>;

/**
 * Product line sent by the client when initializing an order.
 */
export class InitializeOrderItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Product selected by the buyer.',
  })
  productId: string;

  @ApiProperty({
    example: 2,
    minimum: 1,
    maximum: 99,
    description: 'Quantity requested for checkout.',
  })
  quantity: number;

  @ApiProperty({
    example: '650e8400-e29b-41d4-a716-446655440000',
    description: 'Backend-created delivery quote selected for this item.',
  })
  deliveryQuoteId: string;
}

/**
 * Request body for initializing an order from a client-side cart.
 */
export class InitializeOrderDto {
  @ApiProperty({
    type: InitializeOrderItemDto,
    isArray: true,
    description: 'Client-side cart lines to validate and snapshot.',
  })
  items: InitializeOrderItemDto[];
}
