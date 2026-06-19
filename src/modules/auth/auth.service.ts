import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccountStatus,
  UserRole,
  WalletOwnerType,
  WalletStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthResponseDto, PublicUserDto } from './dto/auth-response.dto';
import { LoginInput } from './dto/login.dto';
import { RegisterInput } from './dto/register.dto';
import { PasswordHasherService } from './password-hasher.service';
import { mapPublicUser } from '../users/user.mapper';

const authUserInclude = {
  buyerProfile: {
    include: {
      wallet: true,
    },
  },
} as const;

/**
 * Handles user registration, login, and access-token issuance.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a buyer account and creates the buyer profile plus buyer wallet.
   *
   * @param input - Validated buyer registration payload.
   * @returns Public user data and a JWT access token.
   * @throws ConflictException when the email is already registered.
   */
  async register(input: RegisterInput): Promise<AuthResponseDto> {
    const email = input.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.BUYER,
          phoneNumber: input.phoneNumber,
        },
      });

      const buyerProfile = await tx.buyerProfile.create({
        data: {
          userId: createdUser.id,
          fullName: input.fullName,
          phoneNumber: input.phoneNumber,
        },
      });

      const wallet = await tx.wallet.create({
        data: {
          ownerType: WalletOwnerType.BUYER,
          buyerProfileId: buyerProfile.id,
          status: WalletStatus.ACTIVE,
        },
      });

      return {
        ...createdUser,
        buyerProfile: {
          ...buyerProfile,
          wallet,
        },
      };
    });

    this.logger.log(`Buyer registered for user ${user.id}`);

    return this.buildAuthResponse(mapPublicUser(user));
  }

  /**
   * Authenticates a user with email and password credentials.
   *
   * @param input - Validated login payload.
   * @returns Public user data and a JWT access token.
   * @throws UnauthorizedException when credentials are invalid or inactive.
   */
  async login(input: LoginInput): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: authUserInclude,
    });

    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.passwordHasher.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${user.id}`);

    return this.buildAuthResponse(mapPublicUser(user));
  }

  private async buildAuthResponse(
    user: PublicUserDto,
  ): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user,
    };
  }
}
