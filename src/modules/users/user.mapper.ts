import { PublicUserDto } from '../auth/dto/auth-response.dto';

interface UserLike {
  id: string;
  email: string;
  role: PublicUserDto['role'];
  status: string;
  phoneNumber?: string | null;
  buyerProfile?: {
    id: string;
    fullName: string;
    phoneNumber?: string | null;
    status: string;
    wallet?: {
      id: string;
      ownerType: string;
      status: string;
    } | null;
  } | null;
}

/**
 * Maps user records to a safe public shape.
 *
 * @param user - User-like record selected without sensitive fields.
 * @returns Public user response DTO.
 */
export function mapPublicUser(user: UserLike): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    phoneNumber: user.phoneNumber ?? null,
    buyerProfile: user.buyerProfile
      ? {
          id: user.buyerProfile.id,
          fullName: user.buyerProfile.fullName,
          phoneNumber: user.buyerProfile.phoneNumber ?? null,
          status: user.buyerProfile.status,
          wallet: user.buyerProfile.wallet
            ? {
                id: user.buyerProfile.wallet.id,
                ownerType: user.buyerProfile.wallet.ownerType,
                status: user.buyerProfile.wallet.status,
              }
            : null,
        }
      : null,
  };
}
