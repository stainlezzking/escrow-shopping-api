import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType, KycStatus } from '@prisma/client';

/**
 * Safe KYC document response for seller owners and admins.
 */
export class KycDocumentResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  sellerProfileId: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.NIN })
  documentType: DocumentType;

  @ApiPropertyOptional({
    example: '8901',
    description: 'Last four characters of the submitted document number.',
  })
  documentNumberLast4: string | null;

  @ApiProperty({
    example: true,
    description: 'Indicates that a private file reference exists.',
  })
  hasFileReference: boolean;

  @ApiProperty({ enum: KycStatus, example: KycStatus.PENDING })
  status: KycStatus;

  @ApiPropertyOptional({ example: 'Document image is unreadable' })
  rejectionReason?: string | null;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  reviewedByAdminId?: string | null;

  @ApiPropertyOptional({ example: '2026-06-20T10:00:00.000Z' })
  reviewedAt?: Date | null;

  @ApiProperty({ example: '2026-06-20T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-20T10:00:00.000Z' })
  updatedAt: Date;
}
