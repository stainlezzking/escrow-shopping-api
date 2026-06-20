import { BuyerAddressResponseDto } from './dto/buyer-address-response.dto';
import { BuyerProfileResponseDto } from './dto/buyer-profile-response.dto';

interface BuyerProfileLike {
  id: string;
  fullName: string;
  phoneNumber?: string | null;
  status: BuyerProfileResponseDto['status'];
  createdAt: Date;
  updatedAt: Date;
  wallet?: {
    id: string;
    ownerType: BuyerProfileResponseDto['wallet'] extends infer T
      ? T extends { ownerType: infer U }
        ? U
        : never
      : never;
    status: BuyerProfileResponseDto['wallet'] extends infer T
      ? T extends { status: infer U }
        ? U
        : never
      : never;
  } | null;
}

interface BuyerAddressLike {
  id: string;
  contactName: string;
  phoneNumber?: string | null;
  state: string;
  city?: string | null;
  streetAddress: string;
  deliveryNotes?: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maps a buyer profile record into the owner-safe API response shape.
 *
 * @param profile - Buyer profile record selected for the authenticated user.
 * @returns Profile response without wallet balances or sensitive internals.
 */
export function mapBuyerProfile(
  profile: BuyerProfileLike,
): BuyerProfileResponseDto {
  return {
    id: profile.id,
    fullName: profile.fullName,
    phoneNumber: profile.phoneNumber ?? null,
    status: profile.status,
    wallet: profile.wallet
      ? {
          id: profile.wallet.id,
          ownerType: profile.wallet.ownerType,
          status: profile.wallet.status,
        }
      : null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Maps a buyer address record into the owner-facing API response shape.
 *
 * @param address - Buyer address record.
 * @returns Address response for the owning buyer.
 */
export function mapBuyerAddress(
  address: BuyerAddressLike,
): BuyerAddressResponseDto {
  return {
    id: address.id,
    contactName: address.contactName,
    phoneNumber: address.phoneNumber ?? null,
    state: address.state,
    city: address.city ?? null,
    streetAddress: address.streetAddress,
    deliveryNotes: address.deliveryNotes ?? null,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}
