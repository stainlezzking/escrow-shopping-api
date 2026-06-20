import {
  CreateProductSchema,
  ProductParamsSchema,
  ProductSearchQuerySchema,
  UpdateProductSchema,
  UploadProductImageSchema,
} from './product.dto';

describe('Product DTO schemas', () => {
  it('normalizes create product payloads and query values', () => {
    expect(
      CreateProductSchema.parse({
        sellerProfileId: '550e8400-e29b-41d4-a716-446655440000',
        title: ' iPhone 15 ',
        description: ' Clean device ',
        priceKobo: '250000000',
        stockQuantity: 4,
        categoryIds: ['550e8400-e29b-41d4-a716-446655440001'],
      }),
    ).toEqual({
      sellerProfileId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'iPhone 15',
      description: 'Clean device',
      priceKobo: BigInt(250000000),
      stockQuantity: 4,
      categoryIds: ['550e8400-e29b-41d4-a716-446655440001'],
    });

    expect(
      ProductSearchQuerySchema.parse({ page: '2', limit: '10', q: ' phone ' }),
    ).toEqual({ page: 2, limit: 10, q: 'phone' });
  });

  it('rejects empty update payloads and invalid image metadata', () => {
    expect(() => UpdateProductSchema.parse({})).toThrow();
    expect(() =>
      UploadProductImageSchema.parse({
        storageKey: '../bad-path.png',
        isPrimary: true,
      }),
    ).toThrow();
  });

  it('validates product route params', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';

    expect(ProductParamsSchema.parse({ productId: id })).toEqual({
      productId: id,
    });
    expect(() => ProductParamsSchema.parse({ productId: 'bad-id' })).toThrow();
  });
});
