import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemStatus, OrderStatus } from '@prisma/client';

/**
 * Product snapshot included in an initialized order response.
 */
export class OrderProductSnapshotDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'iPhone 15' })
  title: string;

  @ApiProperty({ example: 'iphone-15' })
  slug: string;
}

/**
 * Seller store snapshot included in an initialized order response.
 */
export class OrderSellerSnapshotDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Tech Haven' })
  businessName: string;

  @ApiProperty({ example: 'tech-haven' })
  storeHandle: string;
}

/**
 * Public-safe order item response with BigInt money values serialized.
 */
export class OrderItemResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: '10000', description: 'Unit price in kobo.' })
  unitPriceAtCheckoutKobo: string;

  @ApiProperty({
    example: '20000',
    description: 'Product line amount in kobo.',
  })
  productAmountKobo: string;

  @ApiProperty({ example: '0', description: 'Shipping fee in kobo.' })
  shippingFeeKobo: string;

  @ApiProperty({ example: '1000', description: 'Service fee in kobo.' })
  serviceFeeKobo: string;

  @ApiProperty({
    example: '20000',
    description: 'Seller net escrow amount in kobo before payment funding.',
  })
  netEscrowAmountKobo: string;

  @ApiProperty({
    enum: OrderItemStatus,
    example: OrderItemStatus.PENDING_PAYMENT,
  })
  status: OrderItemStatus;

  @ApiProperty({ type: OrderProductSnapshotDto })
  product: OrderProductSnapshotDto;

  @ApiProperty({ type: OrderSellerSnapshotDto })
  seller: OrderSellerSnapshotDto;
}

/**
 * Public-safe order initialization response.
 */
export class OrderResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'ORD-20260623-ABC123' })
  orderReference: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @ApiProperty({ example: '20000' })
  totalProductAmountKobo: string;

  @ApiProperty({ example: '0' })
  totalShippingFeeKobo: string;

  @ApiProperty({ example: '1000' })
  totalServiceFeeKobo: string;

  @ApiProperty({ example: '21000' })
  totalOrderAmountKobo: string;

  @ApiProperty({ example: 500, description: 'Service fee basis points used.' })
  serviceFeeBasisPoints: number;

  @ApiProperty({ type: OrderItemResponseDto, isArray: true })
  items: OrderItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true })
  cancelledAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt: Date | null;
}
