import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import { z } from 'zod';

/**
 * Validates seller KYC document submission metadata.
 */
export const SubmitKycDocumentSchema = z.object({
  documentType: z.nativeEnum(DocumentType),
  documentNumber: z.string().trim().min(6).max(32),
  documentImageUrl: z.string().trim().url(),
  storageKey: z.string().trim().min(3).max(240).optional(),
});

/**
 * Validates admin KYC rejection payloads.
 */
export const RejectKycDocumentSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

/**
 * Validates seller profile route params.
 */
export const SellerProfileParamsSchema = z.object({
  sellerProfileId: z.uuid(),
});

/**
 * Validates KYC document route params.
 */
export const KycDocumentParamsSchema = z.object({
  documentId: z.uuid(),
});

export type SubmitKycDocumentInput = z.infer<typeof SubmitKycDocumentSchema>;
export type RejectKycDocumentInput = z.infer<typeof RejectKycDocumentSchema>;
export type SellerProfileParamsInput = z.infer<
  typeof SellerProfileParamsSchema
>;
export type KycDocumentParamsInput = z.infer<typeof KycDocumentParamsSchema>;

/**
 * Request body for seller KYC document submission.
 */
export class SubmitKycDocumentDto {
  @ApiProperty({ enum: DocumentType, example: DocumentType.NIN })
  documentType: DocumentType;

  @ApiProperty({
    example: '12345678901',
    minLength: 6,
    maxLength: 32,
  })
  documentNumber: string;

  @ApiProperty({
    example: 'https://storage.example.com/private/kyc/nin.png',
    description: 'Private file reference URL captured by the upload provider.',
  })
  documentImageUrl: string;

  @ApiPropertyOptional({
    example: 'kyc/store-id/nin.png',
    description: 'Private storage key from the upload provider.',
  })
  storageKey?: string;
}

/**
 * Request body for rejecting a seller KYC document.
 */
export class RejectKycDocumentDto {
  @ApiProperty({
    example: 'Document image is unreadable',
    minLength: 5,
    maxLength: 500,
  })
  reason: string;
}
