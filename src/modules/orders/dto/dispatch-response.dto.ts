import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemStatus } from '@prisma/client';

/**
 * Dispatch evidence metadata returned after seller dispatch.
 */
export class DispatchEvidenceResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiPropertyOptional({ example: 'courier_receipt', nullable: true })
  evidenceType: string | null;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/dispatch/order-item-one.jpg',
    nullable: true,
  })
  imageUrl: string | null;

  @ApiPropertyOptional({
    example: 'dispatch/store-one/order-item-one.jpg',
    nullable: true,
  })
  storageKey: string | null;

  @ApiPropertyOptional({ example: 'DHL-123456789', nullable: true })
  trackingReference: string | null;

  @ApiPropertyOptional({ example: 'GIG Logistics', nullable: true })
  courierName: string | null;

  @ApiPropertyOptional({
    example: 'Package handed to courier at Lekki office.',
    nullable: true,
  })
  notes: string | null;

  @ApiProperty()
  uploadedAt: Date;
}

/**
 * Seller dispatch workflow response.
 */
export class DispatchOrderItemResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  orderId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  orderItemId: string;

  @ApiProperty({ enum: OrderItemStatus, example: OrderItemStatus.DISPATCHED })
  status: OrderItemStatus;

  @ApiProperty()
  dispatchedAt: Date;

  @ApiProperty({
    description: 'Auto-release safety timer expiry timestamp.',
  })
  safetyTimerExpiresAt: Date;

  @ApiProperty({ type: DispatchEvidenceResponseDto })
  evidence: DispatchEvidenceResponseDto;
}
