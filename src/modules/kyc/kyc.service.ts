import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { KycStatus, StoreStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { KycDocumentResponseDto } from './dto/kyc-document-response.dto';
import { SubmitKycDocumentInput } from './dto/kyc.dto';
import { mapKycDocument } from './kyc.mapper';

interface ReviewDocumentInput {
  adminUserId: string;
  adminRole: UserRole;
  documentId: string;
}

interface RejectDocumentInput extends ReviewDocumentInput {
  reason: string;
}

/**
 * Handles seller KYC submissions and admin KYC review decisions.
 */
@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submits KYC document metadata for a seller-owned storefront.
   *
   * @param userId - Authenticated seller user ID.
   * @param sellerProfileId - Seller profile receiving the KYC document.
   * @param input - Validated KYC metadata and private file reference.
   * @returns Safe KYC document response without private file URLs.
   * @throws NotFoundException when the seller profile does not exist.
   * @throws ForbiddenException when the seller profile belongs to another user.
   */
  async submitDocument(
    userId: string,
    sellerProfileId: string,
    input: SubmitKycDocumentInput,
  ): Promise<KycDocumentResponseDto> {
    await this.assertSellerProfileOwnedByUser(sellerProfileId, userId);

    const document = await this.prisma.$transaction(async (tx) => {
      const createdDocument = await tx.kycDocument.create({
        data: {
          sellerProfileId,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          documentImageUrl: input.documentImageUrl,
          storageKey: input.storageKey,
          status: KycStatus.PENDING,
        },
      });

      await tx.sellerProfile.update({
        where: { id: sellerProfileId },
        data: { kycStatus: KycStatus.PENDING, status: StoreStatus.PENDING_KYC },
      });

      return createdDocument;
    });

    this.logger.log(`KYC document submitted for store ${sellerProfileId}`);

    return mapKycDocument(document);
  }

  /**
   * Lists KYC submissions for a seller-owned storefront.
   *
   * @param userId - Authenticated seller user ID.
   * @param sellerProfileId - Seller profile whose KYC submissions are listed.
   * @returns Safe KYC document responses.
   * @throws NotFoundException when the seller profile does not exist.
   * @throws ForbiddenException when the seller profile belongs to another user.
   */
  async listOwnSubmissions(
    userId: string,
    sellerProfileId: string,
  ): Promise<KycDocumentResponseDto[]> {
    await this.assertSellerProfileOwnedByUser(sellerProfileId, userId);

    const documents = await this.prisma.kycDocument.findMany({
      where: { sellerProfileId },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((document) => mapKycDocument(document));
  }

  /**
   * Approves a KYC document and activates the linked seller store.
   *
   * @param input - Admin actor metadata and document ID.
   * @returns Safe KYC document response.
   * @throws NotFoundException when the KYC document does not exist.
   */
  async approveDocument(
    input: ReviewDocumentInput,
  ): Promise<KycDocumentResponseDto> {
    const document = await this.getKycDocumentForReview(input.documentId);
    const reviewedAt = new Date();

    const updatedDocument = await this.prisma.$transaction(async (tx) => {
      const reviewedDocument = await tx.kycDocument.update({
        where: { id: input.documentId },
        data: {
          status: KycStatus.VERIFIED,
          rejectionReason: null,
          reviewedByAdminId: input.adminUserId,
          reviewedAt,
        },
      });

      await tx.sellerProfile.update({
        where: { id: document.sellerProfileId },
        data: { kycStatus: KycStatus.VERIFIED, status: StoreStatus.ACTIVE },
      });

      await tx.adminActivityLog.create({
        data: {
          actorUserId: input.adminUserId,
          actorRole: input.adminRole,
          actionType: 'KYC_APPROVED',
          targetType: 'KycDocument',
          targetId: input.documentId,
          metadata: {
            sellerProfileId: document.sellerProfileId,
          },
        },
      });

      return reviewedDocument;
    });

    this.logger.log(`KYC document approved: ${input.documentId}`);

    return mapKycDocument(updatedDocument);
  }

  /**
   * Rejects a KYC document and keeps the linked seller store pending KYC.
   *
   * @param input - Admin actor metadata, document ID, and rejection reason.
   * @returns Safe KYC document response.
   * @throws NotFoundException when the KYC document does not exist.
   */
  async rejectDocument(
    input: RejectDocumentInput,
  ): Promise<KycDocumentResponseDto> {
    const document = await this.getKycDocumentForReview(input.documentId);
    const reviewedAt = new Date();

    const updatedDocument = await this.prisma.$transaction(async (tx) => {
      const reviewedDocument = await tx.kycDocument.update({
        where: { id: input.documentId },
        data: {
          status: KycStatus.REJECTED,
          rejectionReason: input.reason,
          reviewedByAdminId: input.adminUserId,
          reviewedAt,
        },
      });

      await tx.sellerProfile.update({
        where: { id: document.sellerProfileId },
        data: {
          kycStatus: KycStatus.REJECTED,
          status: StoreStatus.PENDING_KYC,
        },
      });

      await tx.adminActivityLog.create({
        data: {
          actorUserId: input.adminUserId,
          actorRole: input.adminRole,
          actionType: 'KYC_REJECTED',
          targetType: 'KycDocument',
          targetId: input.documentId,
          reason: input.reason,
          metadata: {
            sellerProfileId: document.sellerProfileId,
          },
        },
      });

      return reviewedDocument;
    });

    this.logger.log(`KYC document rejected: ${input.documentId}`);

    return mapKycDocument(updatedDocument);
  }

  private async assertSellerProfileOwnedByUser(
    sellerProfileId: string,
    userId: string,
  ): Promise<void> {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
    });

    if (!sellerProfile) {
      throw new NotFoundException('Seller profile not found');
    }

    if (sellerProfile.userId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to access this seller profile',
      );
    }
  }

  private async getKycDocumentForReview(documentId: string) {
    const document = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
      include: { sellerProfile: true },
    });

    if (!document) {
      throw new NotFoundException('KYC document not found');
    }

    return document;
  }
}
