import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider, PaymentStatus } from '@prisma/client';

/**
 * Public-safe payment response with serialized money values.
 */
export class PaymentResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  orderId: string;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.PAYSTACK })
  provider: PaymentProvider;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiProperty({ example: 'PAY-20260703-ABC123' })
  internalReference: string;

  @ApiPropertyOptional({ example: 'paystack_ref_one', nullable: true })
  providerReference: string | null;

  @ApiProperty({ example: '21000', description: 'Payment amount in kobo.' })
  amountKobo: string;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiPropertyOptional({
    example: 'https://checkout.paystack.com/example',
  })
  authorizationUrl?: string;

  @ApiPropertyOptional({ nullable: true })
  verifiedAt: Date | null;

  @ApiPropertyOptional({ nullable: true })
  failedAt: Date | null;
}
