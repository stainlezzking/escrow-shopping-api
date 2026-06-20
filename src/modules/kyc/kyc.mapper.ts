import { KycDocumentResponseDto } from './dto/kyc-document-response.dto';

interface KycDocumentLike {
  id: string;
  sellerProfileId: string;
  documentType: KycDocumentResponseDto['documentType'];
  documentNumber?: string | null;
  documentImageUrl?: string | null;
  storageKey?: string | null;
  status: KycDocumentResponseDto['status'];
  rejectionReason?: string | null;
  reviewedByAdminId?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maps a KYC document record to a response that avoids exposing private files
 * and full document numbers.
 *
 * @param document - KYC document record.
 * @returns Safe KYC response for authorized users.
 */
export function mapKycDocument(
  document: KycDocumentLike,
): KycDocumentResponseDto {
  return {
    id: document.id,
    sellerProfileId: document.sellerProfileId,
    documentType: document.documentType,
    documentNumberLast4: maskDocumentNumber(document.documentNumber),
    hasFileReference: Boolean(document.documentImageUrl || document.storageKey),
    status: document.status,
    rejectionReason: document.rejectionReason ?? null,
    reviewedByAdminId: document.reviewedByAdminId ?? null,
    reviewedAt: document.reviewedAt ?? null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

/**
 * Returns the last four characters of a submitted document number.
 *
 * @param documentNumber - Raw document number stored for verification.
 * @returns Last four characters, or null when no number exists.
 */
export function maskDocumentNumber(
  documentNumber: string | null | undefined,
): string | null {
  if (!documentNumber) {
    return null;
  }

  return documentNumber.slice(-4);
}
