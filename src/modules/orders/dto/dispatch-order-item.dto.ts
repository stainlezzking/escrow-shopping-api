import { ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const storageKeySchema = z
  .string()
  .trim()
  .min(3)
  .max(240)
  .regex(/^[a-zA-Z0-9/_\-\\.]+$/, 'Storage key contains invalid characters')
  .refine((value) => !value.includes('..'), {
    message: 'Storage key cannot contain parent path traversal',
  });

/**
 * Validates seller dispatch evidence metadata.
 */
export const DispatchOrderItemSchema = z
  .object({
    evidenceType: z.string().trim().min(2).max(80).optional(),
    imageUrl: z.string().trim().url().max(500).optional(),
    storageKey: storageKeySchema.optional(),
    trackingReference: z.string().trim().min(2).max(120).optional(),
    courierName: z.string().trim().min(2).max(120).optional(),
    notes: z.string().trim().min(2).max(500).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.imageUrl || value.storageKey || value.trackingReference),
    {
      message:
        'Dispatch evidence URL, storage key, or tracking reference is required',
    },
  );

/**
 * Validates order item dispatch route params.
 */
export const DispatchOrderItemParamsSchema = z.object({
  orderId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export type DispatchOrderItemInput = z.infer<typeof DispatchOrderItemSchema>;
export type DispatchOrderItemParamsInput = z.infer<
  typeof DispatchOrderItemParamsSchema
>;

/**
 * Request body for storing seller dispatch evidence metadata.
 */
export class DispatchOrderItemDto {
  @ApiPropertyOptional({
    example: 'courier_receipt',
    description: 'Human-readable evidence category.',
    maxLength: 80,
  })
  evidenceType?: string;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/dispatch/order-item-one.jpg',
    description: 'URL for already uploaded dispatch evidence.',
    maxLength: 500,
  })
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 'dispatch/store-one/order-item-one.jpg',
    description: 'Object storage key for uploaded dispatch evidence.',
    maxLength: 240,
  })
  storageKey?: string;

  @ApiPropertyOptional({
    example: 'DHL-123456789',
    description: 'Courier or seller-managed tracking reference.',
    maxLength: 120,
  })
  trackingReference?: string;

  @ApiPropertyOptional({
    example: 'GIG Logistics',
    maxLength: 120,
  })
  courierName?: string;

  @ApiPropertyOptional({
    example: 'Package handed to courier at Lekki office.',
    maxLength: 500,
  })
  notes?: string;
}
