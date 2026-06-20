import {
  CategoryParamsSchema,
  CreateBusinessCategorySchema,
  CreateProductCategorySchema,
  UpdateBusinessCategorySchema,
  UpdateProductCategorySchema,
} from './category.dto';

describe('Category DTO schemas', () => {
  it('normalizes create payloads', () => {
    expect(
      CreateBusinessCategorySchema.parse({
        name: ' Electronics ',
        description: ' Gadgets ',
      }),
    ).toEqual({ name: 'Electronics', description: 'Gadgets' });

    expect(
      CreateProductCategorySchema.parse({
        name: ' Android Phones ',
        parentCategoryId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toEqual({
      name: 'Android Phones',
      parentCategoryId: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('rejects empty update payloads', () => {
    expect(() => UpdateBusinessCategorySchema.parse({})).toThrow();
    expect(() => UpdateProductCategorySchema.parse({})).toThrow();
  });

  it('validates category params', () => {
    expect(
      CategoryParamsSchema.parse({
        categoryId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toEqual({ categoryId: '550e8400-e29b-41d4-a716-446655440000' });
    expect(() =>
      CategoryParamsSchema.parse({ categoryId: 'bad-id' }),
    ).toThrow();
  });
});
