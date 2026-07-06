import { ApiProperty } from '@nestjs/swagger';
import { EscrowStatus, OrderItemStatus } from '@prisma/client';

/**
 * Public-safe response returned after escrow funds are released.
 */
export class EscrowReleaseResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  orderId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  orderItemId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  escrowId: string;

  @ApiProperty({ enum: OrderItemStatus, example: OrderItemStatus.RELEASED })
  orderItemStatus: OrderItemStatus;

  @ApiProperty({ enum: EscrowStatus, example: EscrowStatus.RELEASED })
  escrowStatus: EscrowStatus;

  @ApiProperty({ example: '20000', description: 'Seller net amount in kobo.' })
  sellerNetAmountKobo: string;

  @ApiProperty({ example: '1000', description: 'Platform fee in kobo.' })
  platformFeeKobo: string;

  @ApiProperty()
  confirmedAt: Date;

  @ApiProperty()
  releasedAt: Date;
}
