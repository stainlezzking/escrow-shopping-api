import {
  DispatchOrderItemParamsSchema,
  DispatchOrderItemSchema,
} from './dispatch-order-item.dto';

describe('DispatchOrderItemSchema', () => {
  it('accepts dispatch metadata with a tracking reference', () => {
    const result = DispatchOrderItemSchema.parse({
      evidenceType: 'courier_receipt',
      trackingReference: 'TRK-001',
      courierName: 'GIG Logistics',
    });

    expect(result.trackingReference).toBe('TRK-001');
    expect(result.courierName).toBe('GIG Logistics');
  });

  it('rejects metadata without evidence URL, storage key, or tracking reference', () => {
    const result = DispatchOrderItemSchema.safeParse({
      notes: 'Handed over at courier office',
    });

    expect(result.success).toBe(false);
  });

  it('rejects unsafe storage keys', () => {
    const result = DispatchOrderItemSchema.safeParse({
      storageKey: '../dispatch/evidence.jpg',
    });

    expect(result.success).toBe(false);
  });
});

describe('DispatchOrderItemParamsSchema', () => {
  it('validates dispatch route params', () => {
    const result = DispatchOrderItemParamsSchema.parse({
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      itemId: '650e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.orderId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
