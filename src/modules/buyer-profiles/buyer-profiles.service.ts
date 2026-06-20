import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateBuyerAddressInput,
  UpdateBuyerAddressInput,
} from './dto/address.dto';
import { BuyerAddressResponseDto } from './dto/buyer-address-response.dto';
import { BuyerProfileResponseDto } from './dto/buyer-profile-response.dto';
import { mapBuyerAddress, mapBuyerProfile } from './buyer-profile.mapper';

const buyerProfileInclude = {
  wallet: true,
} as const;

/**
 * Handles current-buyer profile lookup and delivery address management.
 */
@Injectable()
export class BuyerProfilesService {
  private readonly logger = new Logger(BuyerProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the authenticated user's buyer profile.
   *
   * @param userId - Authenticated user ID.
   * @returns Owner-safe buyer profile with wallet summary only.
   * @throws NotFoundException when the buyer profile is missing.
   */
  async getOwnProfile(userId: string): Promise<BuyerProfileResponseDto> {
    const profile = await this.getBuyerProfileForUser(userId);

    return mapBuyerProfile(profile);
  }

  /**
   * Adds a delivery address for the authenticated buyer.
   *
   * The first address automatically becomes default. When requested as default,
   * existing defaults for the buyer are unset inside the same transaction.
   *
   * @param userId - Authenticated user ID.
   * @param input - Validated address creation payload.
   * @returns Created buyer address.
   * @throws NotFoundException when the buyer profile is missing.
   */
  async addAddress(
    userId: string,
    input: CreateBuyerAddressInput,
  ): Promise<BuyerAddressResponseDto> {
    const profile = await this.getBuyerProfileForUser(userId);
    const addressCount = await this.prisma.buyerAddress.count({
      where: { buyerProfileId: profile.id },
    });
    const shouldSetDefault = input.isDefault === true || addressCount === 0;

    const data = {
      buyerProfileId: profile.id,
      contactName: input.contactName,
      phoneNumber: input.phoneNumber,
      state: input.state,
      city: input.city,
      streetAddress: input.streetAddress,
      deliveryNotes: input.deliveryNotes,
      isDefault: shouldSetDefault,
    };

    const address = shouldSetDefault
      ? await this.prisma.$transaction(async (tx) => {
          await tx.buyerAddress.updateMany({
            where: { buyerProfileId: profile.id, isDefault: true },
            data: { isDefault: false },
          });

          return tx.buyerAddress.create({ data });
        })
      : await this.prisma.buyerAddress.create({ data });

    this.logger.log(`Buyer address created for user ${userId}`);

    return mapBuyerAddress(address);
  }

  /**
   * Lists delivery addresses owned by the authenticated buyer.
   *
   * @param userId - Authenticated user ID.
   * @returns Buyer address list sorted with the default address first.
   * @throws NotFoundException when the buyer profile is missing.
   */
  async listOwnAddresses(userId: string): Promise<BuyerAddressResponseDto[]> {
    const profile = await this.getBuyerProfileForUser(userId);
    const addresses = await this.prisma.buyerAddress.findMany({
      where: { buyerProfileId: profile.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses.map((address) => mapBuyerAddress(address));
  }

  /**
   * Updates a delivery address owned by the authenticated buyer.
   *
   * @param userId - Authenticated user ID.
   * @param addressId - Address ID to update.
   * @param input - Validated update payload.
   * @returns Updated buyer address.
   * @throws NotFoundException when profile or address is missing.
   * @throws ForbiddenException when the address belongs to another buyer.
   */
  async updateAddress(
    userId: string,
    addressId: string,
    input: UpdateBuyerAddressInput,
  ): Promise<BuyerAddressResponseDto> {
    const profile = await this.getBuyerProfileForUser(userId);
    await this.assertAddressOwnedByProfile(addressId, profile.id);

    const address = await this.prisma.buyerAddress.update({
      where: { id: addressId },
      data: input,
    });

    return mapBuyerAddress(address);
  }

  /**
   * Marks one delivery address as the default for the authenticated buyer.
   *
   * @param userId - Authenticated user ID.
   * @param addressId - Address ID to set as default.
   * @returns Updated default buyer address.
   * @throws NotFoundException when profile or address is missing.
   * @throws ForbiddenException when the address belongs to another buyer.
   */
  async setDefaultAddress(
    userId: string,
    addressId: string,
  ): Promise<BuyerAddressResponseDto> {
    const profile = await this.getBuyerProfileForUser(userId);
    await this.assertAddressOwnedByProfile(addressId, profile.id);

    const address = await this.prisma.$transaction(async (tx) => {
      await tx.buyerAddress.updateMany({
        where: { buyerProfileId: profile.id, isDefault: true },
        data: { isDefault: false },
      });

      return tx.buyerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });

    this.logger.log(`Default buyer address updated for user ${userId}`);

    return mapBuyerAddress(address);
  }

  private async getBuyerProfileForUser(userId: string) {
    const profile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
      include: buyerProfileInclude,
    });

    if (!profile) {
      throw new NotFoundException('Buyer profile not found');
    }

    return profile;
  }

  private async assertAddressOwnedByProfile(
    addressId: string,
    buyerProfileId: string,
  ): Promise<void> {
    const address = await this.prisma.buyerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('Buyer address not found');
    }

    if (address.buyerProfileId !== buyerProfileId) {
      throw new ForbiddenException(
        'You are not allowed to access this address',
      );
    }
  }
}
