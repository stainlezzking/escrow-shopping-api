import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { BuyerProfilesService } from './buyer-profiles.service';
import {
  AddressParamsSchema,
  CreateBuyerAddressDto,
  CreateBuyerAddressSchema,
  UpdateBuyerAddressDto,
  UpdateBuyerAddressSchema,
} from './dto/address.dto';
import type {
  AddressParamsInput,
  CreateBuyerAddressInput,
  UpdateBuyerAddressInput,
} from './dto/address.dto';
import { BuyerAddressResponseDto } from './dto/buyer-address-response.dto';
import { BuyerProfileResponseDto } from './dto/buyer-profile-response.dto';

/**
 * Handles authenticated buyer profile and address routes.
 */
@ApiTags('Buyer Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buyer-profiles')
export class BuyerProfilesController {
  constructor(private readonly buyerProfilesService: BuyerProfilesService) {}

  /**
   * Returns the authenticated user's buyer profile.
   *
   * @param user - Authenticated user payload.
   * @returns Current buyer profile.
   */
  @Get('me')
  @ApiOperation({ summary: 'Get own buyer profile' })
  @ApiOkResponse({ type: BuyerProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiNotFoundResponse({ description: 'Buyer profile not found' })
  getOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BuyerProfileResponseDto> {
    return this.buyerProfilesService.getOwnProfile(user.sub);
  }

  /**
   * Adds a delivery address for the authenticated buyer.
   *
   * @param user - Authenticated user payload.
   * @param dto - Validated address creation payload.
   * @returns Created buyer address.
   */
  @Post('me/addresses')
  @ApiOperation({ summary: 'Add buyer delivery address' })
  @ApiBody({ type: CreateBuyerAddressDto })
  @ApiCreatedResponse({ type: BuyerAddressResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiNotFoundResponse({ description: 'Buyer profile not found' })
  addAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateBuyerAddressSchema))
    dto: CreateBuyerAddressInput,
  ): Promise<BuyerAddressResponseDto> {
    return this.buyerProfilesService.addAddress(user.sub, dto);
  }

  /**
   * Lists delivery addresses owned by the authenticated buyer.
   *
   * @param user - Authenticated user payload.
   * @returns Buyer address list.
   */
  @Get('me/addresses')
  @ApiOperation({ summary: 'List own buyer delivery addresses' })
  @ApiOkResponse({ type: BuyerAddressResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiNotFoundResponse({ description: 'Buyer profile not found' })
  listOwnAddresses(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BuyerAddressResponseDto[]> {
    return this.buyerProfilesService.listOwnAddresses(user.sub);
  }

  /**
   * Updates a delivery address owned by the authenticated buyer.
   *
   * @param user - Authenticated user payload.
   * @param params - Validated address route params.
   * @param dto - Validated address update payload.
   * @returns Updated buyer address.
   */
  @Patch('me/addresses/:addressId')
  @ApiOperation({ summary: 'Update own buyer delivery address' })
  @ApiParam({ name: 'addressId', description: 'Buyer address ID' })
  @ApiBody({ type: UpdateBuyerAddressDto })
  @ApiOkResponse({ type: BuyerAddressResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Address belongs to another buyer' })
  @ApiNotFoundResponse({ description: 'Buyer profile or address not found' })
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(AddressParamsSchema))
    params: AddressParamsInput,
    @Body(new ZodValidationPipe(UpdateBuyerAddressSchema))
    dto: UpdateBuyerAddressInput,
  ): Promise<BuyerAddressResponseDto> {
    return this.buyerProfilesService.updateAddress(
      user.sub,
      params.addressId,
      dto,
    );
  }

  /**
   * Marks an owned delivery address as the buyer default.
   *
   * @param user - Authenticated user payload.
   * @param params - Validated address route params.
   * @returns Updated default address.
   */
  @Patch('me/addresses/:addressId/default')
  @ApiOperation({ summary: 'Set own default buyer delivery address' })
  @ApiParam({ name: 'addressId', description: 'Buyer address ID' })
  @ApiOkResponse({ type: BuyerAddressResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Address belongs to another buyer' })
  @ApiNotFoundResponse({ description: 'Buyer profile or address not found' })
  setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(AddressParamsSchema))
    params: AddressParamsInput,
  ): Promise<BuyerAddressResponseDto> {
    return this.buyerProfilesService.setDefaultAddress(
      user.sub,
      params.addressId,
    );
  }
}
