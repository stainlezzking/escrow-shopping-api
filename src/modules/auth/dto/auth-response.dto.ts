import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

/**
 * Public wallet summary returned for authenticated users.
 */
export class PublicWalletDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'BUYER' })
  ownerType: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;
}

/**
 * Public buyer profile returned to the owning user.
 */
export class PublicBuyerProfileDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Ada Buyer' })
  fullName: string;

  @ApiProperty({ example: '08012345678', required: false })
  phoneNumber?: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ type: PublicWalletDto, required: false })
  wallet?: PublicWalletDto | null;
}

/**
 * Public user shape that excludes password and token hashes.
 */
export class PublicUserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'buyer@example.com' })
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.BUYER })
  role: UserRole;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: '08012345678', required: false })
  phoneNumber?: string | null;

  @ApiProperty({ type: PublicBuyerProfileDto, required: false })
  buyerProfile?: PublicBuyerProfileDto | null;
}

/**
 * Response payload returned after successful register or login.
 */
export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ type: PublicUserDto })
  user: PublicUserDto;
}
