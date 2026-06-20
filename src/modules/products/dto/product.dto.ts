import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { z } from 'zod';

const optionalTrimmedString = (max: number) =>
  z.string().trim().min(1).max(max).optional();

const moneyKoboSchema = z
  .union([z.string(), z.number(), z.bigint()])
  .transform((value) => BigInt(value))
  .refine((value) => value > BigInt(0), {
    message: 'Amount must be greater than zero',
  });

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
 * Validates seller product creation payloads.
 */
export const CreateProductSchema = z.object({
  sellerProfileId: z.string().uuid(),
  title: z.string().trim().min(2).max(160),
  description: optionalTrimmedString(2000),
  priceKobo: moneyKoboSchema,
  stockQuantity: z.coerce.number().int().min(0),
  categoryIds: z.array(z.string().uuid()).max(10).optional(),
});

/**
 * Validates seller product update payloads.
 */
export const UpdateProductSchema = z
  .object({
    title: z.string().trim().min(2).max(160).optional(),
    description: optionalTrimmedString(2000),
    priceKobo: moneyKoboSchema.optional(),
    stockQuantity: z.coerce.number().int().min(0).optional(),
    status: z
      .enum([
        ProductStatus.DRAFT,
        ProductStatus.LIVE,
        ProductStatus.HIDDEN,
        ProductStatus.OUT_OF_STOCK,
      ])
      .optional(),
    isActive: z.boolean().optional(),
    categoryIds: z.array(z.string().uuid()).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one product field must be provided',
  });

/**
 * Validates product image metadata payloads.
 */
export const UploadProductImageSchema = z.object({
  storageKey: storageKeySchema,
  isPrimary: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

/**
 * Validates product search query params.
 */
export const ProductSearchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().min(1).max(120).optional(),
  categoryId: z.string().uuid().optional(),
});

/**
 * Validates product route params.
 */
export const ProductParamsSchema = z.object({
  productId: z.string().uuid(),
});

/**
 * Validates public store product route params.
 */
export const StoreProductsParamsSchema = z.object({
  storeHandle: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type UploadProductImageInput = z.infer<typeof UploadProductImageSchema>;
export type ProductSearchQueryInput = z.infer<typeof ProductSearchQuerySchema>;
export type ProductParamsInput = z.infer<typeof ProductParamsSchema>;
export type StoreProductsParamsInput = z.infer<
  typeof StoreProductsParamsSchema
>;

/**
 * Request body for creating a seller product.
 */
export class CreateProductDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  sellerProfileId: string;

  @ApiProperty({ example: 'iPhone 15', minLength: 2, maxLength: 160 })
  title: string;

  @ApiPropertyOptional({ example: 'Clean device', maxLength: 2000 })
  description?: string;

  @ApiProperty({ example: '250000000', description: 'Price in kobo.' })
  priceKobo: string;

  @ApiProperty({ example: 4, minimum: 0 })
  stockQuantity: number;

  @ApiPropertyOptional({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    isArray: true,
  })
  categoryIds?: string[];
}

/**
 * Request body for updating a seller product.
 */
export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'iPhone 15 Pro', maxLength: 160 })
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description', maxLength: 2000 })
  description?: string;

  @ApiPropertyOptional({ example: '280000000' })
  priceKobo?: string;

  @ApiPropertyOptional({ example: 3, minimum: 0 })
  stockQuantity?: number;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.LIVE })
  status?: ProductStatus;

  @ApiPropertyOptional({ example: true })
  isActive?: boolean;

  @ApiPropertyOptional({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    isArray: true,
  })
  categoryIds?: string[];
}

/**
 * Request body for storing product image metadata.
 */
export class UploadProductImageDto {
  @ApiProperty({ example: 'products/store-one/phone.png' })
  storageKey: string;

  @ApiPropertyOptional({ example: true })
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  sortOrder?: number;
}
