/* eslint-disable @typescript-eslint/unbound-method */
import { DocumentType, UserRole } from '@prisma/client';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

describe('KycController', () => {
  const sellerUser = {
    sub: 'seller_user',
    email: 'seller@example.com',
    role: UserRole.SELLER,
  };
  const adminUser = {
    sub: 'admin_user',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  it('delegates seller KYC submission to the service', async () => {
    const service = {
      submitDocument: jest.fn().mockResolvedValue({ id: 'kyc_one' }),
    } as unknown as jest.Mocked<KycService>;
    const controller = new KycController(service);
    const dto = {
      documentType: DocumentType.NIN,
      documentNumber: '12345678901',
      documentImageUrl: 'https://private-storage.example/kyc/nin.png',
      storageKey: 'kyc/store_one/nin.png',
    };

    await expect(
      controller.submitDocument(
        sellerUser,
        { sellerProfileId: 'store_one' },
        dto,
      ),
    ).resolves.toEqual({ id: 'kyc_one' });
    expect(service.submitDocument).toHaveBeenCalledWith(
      'seller_user',
      'store_one',
      dto,
    );
  });

  it('delegates seller-owned KYC listing to the service', async () => {
    const service = {
      listOwnSubmissions: jest.fn().mockResolvedValue([{ id: 'kyc_one' }]),
    } as unknown as jest.Mocked<KycService>;
    const controller = new KycController(service);

    await expect(
      controller.listOwnSubmissions(sellerUser, {
        sellerProfileId: 'store_one',
      }),
    ).resolves.toEqual([{ id: 'kyc_one' }]);
    expect(service.listOwnSubmissions).toHaveBeenCalledWith(
      'seller_user',
      'store_one',
    );
  });

  it('delegates admin KYC approval to the service', async () => {
    const service = {
      approveDocument: jest.fn().mockResolvedValue({ id: 'kyc_one' }),
    } as unknown as jest.Mocked<KycService>;
    const controller = new KycController(service);

    await expect(
      controller.approveDocument(adminUser, { documentId: 'kyc_one' }),
    ).resolves.toEqual({ id: 'kyc_one' });
    expect(service.approveDocument).toHaveBeenCalledWith({
      adminUserId: 'admin_user',
      adminRole: UserRole.ADMIN,
      documentId: 'kyc_one',
    });
  });

  it('delegates admin KYC rejection to the service', async () => {
    const service = {
      rejectDocument: jest.fn().mockResolvedValue({ id: 'kyc_one' }),
    } as unknown as jest.Mocked<KycService>;
    const controller = new KycController(service);

    await expect(
      controller.rejectDocument(
        adminUser,
        { documentId: 'kyc_one' },
        { reason: 'Document image is unreadable' },
      ),
    ).resolves.toEqual({ id: 'kyc_one' });
    expect(service.rejectDocument).toHaveBeenCalledWith({
      adminUserId: 'admin_user',
      adminRole: UserRole.ADMIN,
      documentId: 'kyc_one',
      reason: 'Document image is unreadable',
    });
  });
});
