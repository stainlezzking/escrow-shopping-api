import { z } from 'zod';

/**
 * Validates buyer confirmation route params.
 */
export const ConfirmOrderItemParamsSchema = z.object({
  orderId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export type ConfirmOrderItemParamsInput = z.infer<
  typeof ConfirmOrderItemParamsSchema
>;
