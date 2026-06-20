/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentType, KycStatus, StoreStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { KycService } from './kyc.service';

describe('KycService', () => {
  const now = new Date('2026-06-20T10:00:00.000Z');
  const sellerProfile = {
    id: 'store_one',
    userId: 'seller_user',
    businessName: 'Tech Haven',
    storeHandle: 'tech-haven',
    kycStatus: KycStatus.NOT_SUBMITTED,
    status: StoreStatus.PENDING_KYC,
  };
  const kycDocument = {
    id: 'kyc_one',
    sellerProfileId: 'store_one',
    documentType: DocumentType.NIN,
    documentNumber: '12345678901',
    documentImageUrl: 'https://private-storage.example/kyc/nin.png',
    storageKey: 'kyc/store_one/nin.png',
    status: KycStatus.PENDING,
    rejectionReason: null,
    reviewedByAdminId: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  let tx: {
    kycDocument: {
      create: jest.Mock;
      update: jest.Mock;
    };
    sellerProfile: {
      update: jest.Mock;
    };
    adminActivityLog: {
      create: jest.Mock;
    };
  };
  let prisma: jest.Mocked<PrismaService>;
  let service: KycService;

  beforeEach(() => {
    tx = {
      kycDocument: {
        create: jest.fn().mockResolvedValue(kycDocument),
        update: jest.fn().mockResolvedValue(kycDocument),
      },
      sellerProfile: {
        update: jest.fn().mockResolvedValue(sellerProfile),
      },
      adminActivityLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit_one' }),
      },
    };

    prisma = {
      sellerProfile: {
        findUnique: jest.fn(),
      },
      kycDocument: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as jest.Mocked<PrismaService>;

    service = new KycService(prisma);
  });

  it('submits KYC metadata for a seller-owned storefront', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue(sellerProfile);

    const result = await service.submitDocument('seller_user', 'store_one', {
      documentType: DocumentType.NIN,
      documentNumber: '12345678901',
      documentImageUrl: 'https://private-storage.example/kyc/nin.png',
      storageKey: 'kyc/store_one/nin.png',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.kycDocument.create).toHaveBeenCalledWith({
      data: {
        sellerProfileId: 'store_one',
        documentType: DocumentType.NIN,
        documentNumber: '12345678901',
        documentImageUrl: 'https://private-storage.example/kyc/nin.png',
        storageKey: 'kyc/store_one/nin.png',
        status: KycStatus.PENDING,
      },
    });
    expect(tx.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: 'store_one' },
      data: { kycStatus: KycStatus.PENDING, status: StoreStatus.PENDING_KYC },
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'kyc_one',
        documentType: DocumentType.NIN,
        documentNumberLast4: '8901',
        hasFileReference: true,
      }),
    );
    expect(JSON.stringify(result)).not.toContain('12345678901');
    expect(JSON.stringify(result)).not.toContain('private-storage');
    expect(JSON.stringify(result)).not.toContain('storageKey');
  });

  it('rejects KYC submission for another seller storefront', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue({
      ...sellerProfile,
      userId: 'other_user',
    });

    await expect(
      service.submitDocument('seller_user', 'store_one', {
        documentType: DocumentType.NIN,
        documentNumber: '12345678901',
        documentImageUrl: 'https://private-storage.example/kyc/nin.png',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists only KYC submissions for a seller-owned storefront', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue(sellerProfile);
    prisma.kycDocument.findMany.mockResolvedValue([kycDocument]);

    const result = await service.listOwnSubmissions('seller_user', 'store_one');

    expect(prisma.kycDocument.findMany).toHaveBeenCalledWith({
      where: { sellerProfileId: 'store_one' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('12345678901');
    expect(JSON.stringify(result)).not.toContain('private-storage');
  });

  it('approves KYC and activates the seller store with an audit log', async () => {
    prisma.kycDocument.findUnique.mockResolvedValue({
      ...kycDocument,
      sellerProfile,
    });
    tx.kycDocument.update.mockResolvedValue({
      ...kycDocument,
      status: KycStatus.VERIFIED,
      reviewedByAdminId: 'admin_user',
      reviewedAt: now,
    });

    const result = await service.approveDocument({
      adminUserId: 'admin_user',
      adminRole: UserRole.ADMIN,
      documentId: 'kyc_one',
    });

    expect(tx.kycDocument.update).toHaveBeenCalledWith({
      where: { id: 'kyc_one' },
      data: expect.objectContaining({
        status: KycStatus.VERIFIED,
        reviewedByAdminId: 'admin_user',
        rejectionReason: null,
      }),
    });
    expect(tx.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: 'store_one' },
      data: { kycStatus: KycStatus.VERIFIED, status: StoreStatus.ACTIVE },
    });
    expect(tx.adminActivityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'admin_user',
        actorRole: UserRole.ADMIN,
        actionType: 'KYC_APPROVED',
        targetType: 'KycDocument',
        targetId: 'kyc_one',
      }),
    });
    expect(result.status).toBe(KycStatus.VERIFIED);
  });

  it('rejects KYC, keeps the store pending, and records the reason in audit log', async () => {
    prisma.kycDocument.findUnique.mockResolvedValue({
      ...kycDocument,
      sellerProfile,
    });
    tx.kycDocument.update.mockResolvedValue({
      ...kycDocument,
      status: KycStatus.REJECTED,
      rejectionReason: 'Document image is unreadable',
      reviewedByAdminId: 'admin_user',
      reviewedAt: now,
    });

    const result = await service.rejectDocument({
      adminUserId: 'admin_user',
      adminRole: UserRole.ADMIN,
      documentId: 'kyc_one',
      reason: 'Document image is unreadable',
    });

    expect(tx.sellerProfile.update).toHaveBeenCalledWith({
      where: { id: 'store_one' },
      data: { kycStatus: KycStatus.REJECTED, status: StoreStatus.PENDING_KYC },
    });
    expect(tx.adminActivityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: 'KYC_REJECTED',
        reason: 'Document image is unreadable',
      }),
    });
    expect(result.status).toBe(KycStatus.REJECTED);
    expect(result.rejectionReason).toBe('Document image is unreadable');
  });

  it('rejects admin decisions for missing KYC documents', async () => {
    prisma.kycDocument.findUnique.mockResolvedValue(null);

    await expect(
      service.approveDocument({
        adminUserId: 'admin_user',
        adminRole: UserRole.ADMIN,
        documentId: 'missing_kyc',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
