import { ApiProperty } from '@nestjs/swagger';
import { EscrowStatus, OrderItemStatus } from '@prisma/client';

/**
 * Public-safe response returned after escrow funds are refunded.
 */
export class EscrowRefundResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  orderId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  orderItemId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  escrowId: string;

  @ApiProperty({ enum: OrderItemStatus, example: OrderItemStatus.REFUNDED })
  orderItemStatus: OrderItemStatus;

  @ApiProperty({ enum: EscrowStatus, example: EscrowStatus.REFUNDED })
  escrowStatus: EscrowStatus;

  @ApiProperty({ example: '21000', description: 'Refund amount in kobo.' })
  refundAmountKobo: string;

  @ApiProperty()
  refundedAt: Date;
}
