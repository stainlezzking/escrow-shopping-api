import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisibilityStatus } from '@prisma/client';

/**
 * Public/admin business category response.
 */
export class BusinessCategoryResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiPropertyOptional({ example: 'Gadgets and electronics' })
  description?: string | null;

  @ApiProperty({ enum: VisibilityStatus, example: VisibilityStatus.ACTIVE })
  status: VisibilityStatus;

  @ApiProperty({ example: '2026-06-20T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-20T12:00:00.000Z' })
  updatedAt: Date;
}

/**
 * Product category response.
 */
export class ProductCategoryResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Phones' })
  name: string;

  @ApiProperty({ example: 'phones' })
  slug: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  parentCategoryId?: string | null;

  @ApiProperty({ example: 1 })
  level: number;

  @ApiPropertyOptional({ example: 'Mobile phones' })
  description?: string | null;

  @ApiProperty({ enum: VisibilityStatus, example: VisibilityStatus.ACTIVE })
  status: VisibilityStatus;

  @ApiProperty({ example: '2026-06-20T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-20T12:00:00.000Z' })
  updatedAt: Date;
}

/**
 * Recursive public product category tree node.
 */
export class ProductCategoryTreeNodeDto extends ProductCategoryResponseDto {
  @ApiProperty({ type: () => ProductCategoryTreeNodeDto, isArray: true })
  children: ProductCategoryTreeNodeDto[];
}
