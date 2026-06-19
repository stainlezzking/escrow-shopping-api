import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  KycStatus,
  StoreStatus,
  WalletOwnerType,
  WalletStatus,
} from '@prisma/client';

/**
 * Public seller wallet summary returned to a store owner.
 */
export class SellerWalletSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ enum: WalletOwnerType, example: WalletOwnerType.SELLER })
  ownerType: WalletOwnerType;

  @ApiProperty({ enum: WalletStatus, example: WalletStatus.ACTIVE })
  status: WalletStatus;
}

/**
 * Masked bank details safe for owner-facing API responses.
 */
export class StoreBankDetailsDto {
  @ApiProperty({ example: 'Access Bank' })
  bankName: string;

  @ApiProperty({ example: 'Ada Buyer' })
  accountName: string;

  @ApiProperty({ example: '6789' })
  accountNumberLast4: string | null;
}

/**
 * Owner-facing storefront payload with sensitive bank values masked.
 */
export class SellerStorefrontResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Tech Haven' })
  businessName: string;

  @ApiProperty({ example: 'tech-haven' })
  storeHandle: string;

  @ApiPropertyOptional({ example: 'https://escrova.test/stores/tech-haven' })
  storeUrl?: string | null;

  @ApiPropertyOptional({ example: 'Lagos' })
  baseLocation?: string | null;

  @ApiProperty({ enum: KycStatus, example: KycStatus.NOT_SUBMITTED })
  kycStatus: KycStatus;

  @ApiProperty({ enum: StoreStatus, example: StoreStatus.PENDING_KYC })
  status: StoreStatus;

  @ApiProperty({ type: StoreBankDetailsDto })
  bankDetails: StoreBankDetailsDto;

  @ApiProperty({ type: SellerWalletSummaryDto, required: false })
  wallet?: SellerWalletSummaryDto | null;
}
