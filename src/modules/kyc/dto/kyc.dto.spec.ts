import { DocumentType } from '@prisma/client';
import {
  KycDocumentParamsSchema,
  RejectKycDocumentSchema,
  SellerProfileParamsSchema,
  SubmitKycDocumentSchema,
} from './kyc.dto';

describe('KYC DTO schemas', () => {
  it('normalizes valid KYC submission metadata', () => {
    const result = SubmitKycDocumentSchema.parse({
      documentType: DocumentType.NIN,
      documentNumber: ' 12345678901 ',
      documentImageUrl: ' https://private-storage.example/kyc/nin.png ',
      storageKey: ' kyc/store-one/nin.png ',
    });

    expect(result).toEqual({
      documentType: DocumentType.NIN,
      documentNumber: '12345678901',
      documentImageUrl: 'https://private-storage.example/kyc/nin.png',
      storageKey: 'kyc/store-one/nin.png',
    });
  });

  it('rejects invalid document metadata and empty rejection reasons', () => {
    expect(() =>
      SubmitKycDocumentSchema.parse({
        documentType: 'PASSPORT',
        documentNumber: '123',
        documentImageUrl: 'not-a-url',
      }),
    ).toThrow();
    expect(() => RejectKycDocumentSchema.parse({ reason: '' })).toThrow();
  });

  it('validates UUID route params', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';

    expect(SellerProfileParamsSchema.parse({ sellerProfileId: id })).toEqual({
      sellerProfileId: id,
    });
    expect(KycDocumentParamsSchema.parse({ documentId: id })).toEqual({
      documentId: id,
    });
    expect(() =>
      SellerProfileParamsSchema.parse({ sellerProfileId: 'bad-id' }),
    ).toThrow();
  });
});
