import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus, WalletOwnerType, WalletStatus } from '@prisma/client';

/**
 * Buyer wallet summary safe for buyer profile responses.
 */
export class BuyerWalletSummaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ enum: WalletOwnerType, example: WalletOwnerType.BUYER })
  ownerType: WalletOwnerType;

  @ApiProperty({ enum: WalletStatus, example: WalletStatus.ACTIVE })
  status: WalletStatus;
}

/**
 * Current buyer profile response without sensitive wallet internals.
 */
export class BuyerProfileResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Ada Buyer' })
  fullName: string;

  @ApiPropertyOptional({ example: '08012345678' })
  phoneNumber?: string | null;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  status: AccountStatus;

  @ApiProperty({ type: BuyerWalletSummaryDto, required: false })
  wallet?: BuyerWalletSummaryDto | null;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  updatedAt: Date;
}
