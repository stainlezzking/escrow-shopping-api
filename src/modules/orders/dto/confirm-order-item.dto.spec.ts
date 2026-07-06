import { ConfirmOrderItemParamsSchema } from './confirm-order-item.dto';

describe('ConfirmOrderItemParamsSchema', () => {
  it('validates buyer confirmation route params', () => {
    const result = ConfirmOrderItemParamsSchema.parse({
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      itemId: '650e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.itemId).toBe('650e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects invalid order item params', () => {
    const result = ConfirmOrderItemParamsSchema.safeParse({
      orderId: 'not-a-uuid',
      itemId: '650e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(false);
  });
});
