import { SellerStorefrontResponseDto } from './dto/seller-storefront-response.dto';
import { maskBankAccount } from './helpers/mask-bank-account.helper';

interface SellerStorefrontLike {
  id: string;
  businessName: string;
  storeHandle: string;
  storeUrl?: string | null;
  baseLocation?: string | null;
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  kycStatus: SellerStorefrontResponseDto['kycStatus'];
  status: SellerStorefrontResponseDto['status'];
  wallet?: {
    id: string;
    ownerType: SellerStorefrontResponseDto['wallet'] extends infer T
      ? T extends { ownerType: infer U }
        ? U
        : never
      : never;
    status: SellerStorefrontResponseDto['wallet'] extends infer T
      ? T extends { status: infer U }
        ? U
        : never
      : never;
  } | null;
}

/**
 * Maps a seller profile record to an owner-safe storefront response.
 *
 * @param store - Seller profile record selected for the owner.
 * @returns Storefront response with bank account number masked.
 */
export function mapSellerStorefront(
  store: SellerStorefrontLike,
): SellerStorefrontResponseDto {
  return {
    id: store.id,
    businessName: store.businessName,
    storeHandle: store.storeHandle,
    storeUrl: store.storeUrl ?? null,
    baseLocation: store.baseLocation ?? null,
    kycStatus: store.kycStatus,
    status: store.status,
    bankDetails: {
      bankName: store.bankName ?? '',
      accountName: store.accountName ?? '',
      accountNumberLast4: maskBankAccount(store.accountNumber),
    },
    wallet: store.wallet
      ? {
          id: store.wallet.id,
          ownerType: store.wallet.ownerType,
          status: store.wallet.status,
        }
      : null,
  };
}
