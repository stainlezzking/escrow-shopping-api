import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, WalletOwnerType, WalletStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateStorefrontInput } from './dto/create-storefront.dto';
import { SellerStorefrontResponseDto } from './dto/seller-storefront-response.dto';
import { mapSellerStorefront } from './seller-storefront.mapper';

const sellerStorefrontInclude = {
  wallet: true,
} as const;

/**
 * Handles seller storefront creation, ownership lookup, and active context.
 */
@Injectable()
export class SellerStorefrontsService {
  private readonly logger = new Logger(SellerStorefrontsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a seller storefront owned by the authenticated user.
   *
   * The method validates handle uniqueness, stores bank metadata for payouts,
   * creates the dedicated seller wallet, and upgrades the user role to SELLER
   * for role-gated seller workflows.
   *
   * @param userId - Authenticated user ID.
   * @param input - Validated storefront creation payload.
   * @returns Owner-safe storefront details with masked bank account metadata.
   * @throws ConflictException when the store handle is already taken.
   */
  async createStorefront(
    userId: string,
    input: CreateStorefrontInput,
  ): Promise<SellerStorefrontResponseDto> {
    const storeHandle = input.storeHandle.toLowerCase();
    const existingStore = await this.prisma.sellerProfile.findUnique({
      where: { storeHandle },
    });

    if (existingStore) {
      throw new ConflictException('Store handle is already taken');
    }

    const store = await this.prisma.$transaction(async (tx) => {
      const createdStore = await tx.sellerProfile.create({
        data: {
          userId,
          businessName: input.businessName,
          storeHandle,
          username: storeHandle,
          storeUrl: this.buildStoreUrl(storeHandle),
          businessCategoryId: input.businessCategoryId,
          baseLocation: input.baseLocation,
          bankName: input.bankName,
          accountNumber: input.accountNumber,
          accountName: input.accountName,
        },
      });

      const wallet = await tx.wallet.create({
        data: {
          ownerType: WalletOwnerType.SELLER,
          sellerProfileId: createdStore.id,
          status: WalletStatus.ACTIVE,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { role: UserRole.SELLER },
      });

      return {
        ...createdStore,
        wallet,
      };
    });

    this.logger.log(`Seller storefront created for user ${userId}`);

    return mapSellerStorefront(store);
  }

  /**
   * Lists storefronts owned by the authenticated user.
   *
   * @param userId - Authenticated user ID.
   * @returns Owner-safe storefront list.
   */
  async listOwnedStorefronts(
    userId: string,
  ): Promise<SellerStorefrontResponseDto[]> {
    const stores = await this.prisma.sellerProfile.findMany({
      where: { userId },
      include: sellerStorefrontInclude,
      orderBy: { createdAt: 'desc' },
    });

    return stores.map((store) => mapSellerStorefront(store));
  }

  /**
   * Returns the active storefront context selected by the authenticated user.
   *
   * @param userId - Authenticated user ID.
   * @param storeId - Storefront ID selected as the active context.
   * @returns Owner-safe active storefront context.
   * @throws NotFoundException when the store does not exist.
   * @throws ForbiddenException when the store belongs to another user.
   */
  async getActiveStoreContext(
    userId: string,
    storeId: string,
  ): Promise<SellerStorefrontResponseDto> {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { id: storeId },
      include: sellerStorefrontInclude,
    });

    if (!store) {
      throw new NotFoundException('Storefront not found');
    }

    if (store.userId !== userId) {
      throw new ForbiddenException('You are not allowed to access this store');
    }

    return mapSellerStorefront(store);
  }

  private buildStoreUrl(storeHandle: string): string {
    return `https://escrova.test/stores/${storeHandle}`;
  }
}
