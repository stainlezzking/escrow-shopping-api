import { InitializeOrderSchema } from './initialize-order.dto';

describe('InitializeOrderSchema', () => {
  it('accepts checkout items and coerces quantity', () => {
    const parsed = InitializeOrderSchema.parse({
      items: [
        {
          productId: '550e8400-e29b-41d4-a716-446655440000',
          quantity: '2',
        },
      ],
    });

    expect(parsed.items[0].quantity).toBe(2);
  });

  it('rejects empty checkout items', () => {
    expect(() => InitializeOrderSchema.parse({ items: [] })).toThrow();
  });
});
