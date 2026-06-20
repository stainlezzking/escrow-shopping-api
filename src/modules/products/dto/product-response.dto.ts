import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';

/**
 * Public seller store summary included in product responses.
 */
export class ProductSellerSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Tech Haven' })
  businessName: string;

  @ApiProperty({ example: 'tech-haven' })
  storeHandle: string;
}

/**
 * Product image response.
 */
export class ProductImageResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({
    example:
      'http://localhost:9000/escrova-product-images/products/store-one/phone.png',
  })
  imageUrl: string;

  @ApiPropertyOptional({ example: 'products/store-one/phone.png' })
  storageKey?: string | null;

  @ApiProperty({ example: true })
  isPrimary: boolean;

  @ApiProperty({ example: 0 })
  sortOrder: number;
}

/**
 * Product response safe for seller and public API consumers.
 */
export class ProductResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'iPhone 15' })
  title: string;

  @ApiProperty({ example: 'iphone-15' })
  slug: string;

  @ApiPropertyOptional({ example: 'Clean device' })
  description?: string | null;

  @ApiProperty({ example: '250000000', description: 'Price in kobo.' })
  priceKobo: string;

  @ApiProperty({ example: 4 })
  stockQuantity: number;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.LIVE })
  status: ProductStatus;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: ProductSellerSummaryDto })
  seller: ProductSellerSummaryDto;

  @ApiProperty({ type: ProductImageResponseDto, isArray: true })
  images: ProductImageResponseDto[];

  @ApiProperty({ example: '2026-06-20T13:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-20T13:00:00.000Z' })
  updatedAt: Date;
}
