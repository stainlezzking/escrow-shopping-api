import { z } from 'zod';

/**
 * Validates buyer confirmation route params.
 */
export const ConfirmOrderItemParamsSchema = z.object({
  orderId: z.uuid(),
  itemId: z.uuid(),
});

export type ConfirmOrderItemParamsInput = z.infer<
  typeof ConfirmOrderItemParamsSchema
>;
