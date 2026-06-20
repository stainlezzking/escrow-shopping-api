import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Owner-facing buyer delivery address payload.
 */
export class BuyerAddressResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Ada Buyer' })
  contactName: string;

  @ApiPropertyOptional({ example: '08012345678' })
  phoneNumber?: string | null;

  @ApiProperty({ example: 'Lagos' })
  state: string;

  @ApiPropertyOptional({ example: 'Ikeja' })
  city?: string | null;

  @ApiProperty({ example: '12 Allen Avenue' })
  streetAddress: string;

  @ApiPropertyOptional({ example: 'Call before delivery' })
  deliveryNotes?: string | null;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  updatedAt: Date;
}
