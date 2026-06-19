import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PublicUserDto } from '../auth/dto/auth-response.dto';
import { mapPublicUser } from './user.mapper';

const publicUserInclude = {
  buyerProfile: {
    include: {
      wallet: true,
    },
  },
} as const;

/**
 * Provides safe user lookup operations for authenticated API flows.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds the current authenticated user and returns only public fields.
   *
   * @param userId - Authenticated user ID from the access token.
   * @returns Public user payload without password or token hashes.
   * @throws NotFoundException when the user no longer exists.
   */
  async findCurrentUser(userId: string): Promise<PublicUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: publicUserInclude,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return mapPublicUser(user);
  }
}
