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
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuthResponseDto, PublicUserDto } from './dto/auth-response.dto';
import { GoogleAuthInput } from './dto/google-auth.dto';
import { LoginInput } from './dto/login.dto';
import { RegisterInput } from './dto/register.dto';
import { GoogleIdentityVerifierService } from './google-identity-verifier.service';
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
    private readonly googleVerifier: GoogleIdentityVerifierService,
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

  /**
   * Signs up or signs in a buyer with a verified Google ID token.
   *
   * @param input - Validated Google authentication payload.
   * @returns Public user data and a JWT access token.
   * @throws UnauthorizedException when Google does not verify the email.
   */
  async authenticateWithGoogle(
    input: GoogleAuthInput,
  ): Promise<AuthResponseDto> {
    const identity = await this.googleVerifier.verifyIdToken(input.idToken);

    if (!identity.emailVerified) {
      throw new UnauthorizedException('Google email must be verified');
    }

    const existingGoogleUser = await this.prisma.user.findUnique({
      where: { googleId: identity.googleId },
      include: authUserInclude,
    });

    if (existingGoogleUser) {
      await this.prisma.user.update({
        where: { id: existingGoogleUser.id },
        data: { lastLoginAt: new Date() },
      });

      this.logger.log(`Google user logged in: ${existingGoogleUser.id}`);

      return this.buildAuthResponse(mapPublicUser(existingGoogleUser));
    }

    const existingEmailUser = await this.prisma.user.findUnique({
      where: { email: identity.email },
      include: authUserInclude,
    });

    if (existingEmailUser) {
      const linkedUser = await this.prisma.user.update({
        where: { id: existingEmailUser.id },
        data: {
          googleId: identity.googleId,
          lastLoginAt: new Date(),
        },
        include: authUserInclude,
      });

      this.logger.log(`Google identity linked for user ${linkedUser.id}`);

      return this.buildAuthResponse(mapPublicUser(linkedUser));
    }

    const passwordHash = await this.passwordHasher.hash(
      randomBytes(32).toString('hex'),
    );
    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: identity.email,
          googleId: identity.googleId,
          passwordHash,
          role: UserRole.BUYER,
        },
      });

      const buyerProfile = await tx.buyerProfile.create({
        data: {
          userId: createdUser.id,
          fullName: identity.fullName,
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

    this.logger.log(`Google buyer registered for user ${user.id}`);

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
