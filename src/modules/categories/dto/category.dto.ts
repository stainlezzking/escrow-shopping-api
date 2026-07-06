import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const optionalTrimmedString = (max: number) =>
  z.string().trim().min(1).max(max).optional();

/**
 * Validates business category creation payloads.
 */
export const CreateBusinessCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalTrimmedString(240),
});

/**
 * Validates business category update payloads.
 */
export const UpdateBusinessCategorySchema =
  CreateBusinessCategorySchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    { message: 'At least one category field must be provided' },
  );

/**
 * Validates product category creation payloads.
 */
export const CreateProductCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  parentCategoryId: z.uuid().optional(),
  description: optionalTrimmedString(240),
});

/**
 * Validates product category update payloads.
 */
export const UpdateProductCategorySchema =
  CreateProductCategorySchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    { message: 'At least one category field must be provided' },
  );

/**
 * Validates category route parameters.
 */
export const CategoryParamsSchema = z.object({
  categoryId: z.uuid(),
});

export type CreateBusinessCategoryInput = z.infer<
  typeof CreateBusinessCategorySchema
>;
export type UpdateBusinessCategoryInput = z.infer<
  typeof UpdateBusinessCategorySchema
>;
export type CreateProductCategoryInput = z.infer<
  typeof CreateProductCategorySchema
>;
export type UpdateProductCategoryInput = z.infer<
  typeof UpdateProductCategorySchema
>;
export type CategoryParamsInput = z.infer<typeof CategoryParamsSchema>;

/**
 * Request body for creating a business category.
 */
export class CreateBusinessCategoryDto {
  @ApiProperty({ example: 'Electronics', minLength: 2, maxLength: 120 })
  name: string;

  @ApiPropertyOptional({ example: 'Gadgets and electronics', maxLength: 240 })
  description?: string;
}

/**
 * Request body for updating a business category.
 */
export class UpdateBusinessCategoryDto {
  @ApiPropertyOptional({ example: 'Consumer Electronics', maxLength: 120 })
  name?: string;

  @ApiPropertyOptional({ example: 'Phones, gadgets, and accessories' })
  description?: string;
}

/**
 * Request body for creating a product category.
 */
export class CreateProductCategoryDto {
  @ApiProperty({ example: 'Phones', minLength: 2, maxLength: 120 })
  name: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  parentCategoryId?: string;

  @ApiPropertyOptional({ example: 'Mobile phones', maxLength: 240 })
  description?: string;
}

/**
 * Request body for updating a product category.
 */
export class UpdateProductCategoryDto {
  @ApiPropertyOptional({ example: 'Smartphones', minLength: 2, maxLength: 120 })
  name?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  parentCategoryId?: string;

  @ApiPropertyOptional({ example: 'Android and iOS phones', maxLength: 240 })
  description?: string;
}
