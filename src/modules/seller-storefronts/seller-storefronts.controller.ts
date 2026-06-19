import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
import {
  CreateStorefrontDto,
  CreateStorefrontSchema,
} from './dto/create-storefront.dto';
import type { CreateStorefrontInput } from './dto/create-storefront.dto';
import { SellerStorefrontResponseDto } from './dto/seller-storefront-response.dto';
import { SellerStorefrontsService } from './seller-storefronts.service';

/**
 * Handles owner-facing seller storefront routes.
 */
@ApiTags('Seller Storefronts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller-storefronts')
export class SellerStorefrontsController {
  constructor(
    private readonly sellerStorefrontsService: SellerStorefrontsService,
  ) {}

  /**
   * Creates a storefront for the authenticated user.
   *
   * @param user - Authenticated user payload.
   * @param dto - Validated storefront creation payload.
   * @returns Created owner-safe storefront payload.
   */
  @Post()
  @UsePipes(new ZodValidationPipe(CreateStorefrontSchema))
  @ApiOperation({ summary: 'Create a seller storefront' })
  @ApiBody({ type: CreateStorefrontDto })
  @ApiCreatedResponse({ type: SellerStorefrontResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiConflictResponse({ description: 'Store handle is already taken' })
  createStorefront(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStorefrontInput,
  ): Promise<SellerStorefrontResponseDto> {
    return this.sellerStorefrontsService.createStorefront(user.sub, dto);
  }

  /**
   * Lists storefronts owned by the authenticated user.
   *
   * @param user - Authenticated user payload.
   * @returns Owner-safe storefront list.
   */
  @Get()
  @ApiOperation({ summary: 'List storefronts owned by the current user' })
  @ApiOkResponse({ type: SellerStorefrontResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  listOwnedStorefronts(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SellerStorefrontResponseDto[]> {
    return this.sellerStorefrontsService.listOwnedStorefronts(user.sub);
  }

  /**
   * Returns a store context only when owned by the authenticated user.
   *
   * @param user - Authenticated user payload.
   * @param storeId - Storefront ID.
   * @returns Owner-safe active storefront context.
   */
  @Get(':storeId/context')
  @ApiOperation({ summary: 'Get active storefront context' })
  @ApiParam({ name: 'storeId', description: 'Storefront ID' })
  @ApiOkResponse({ type: SellerStorefrontResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Storefront belongs to another user' })
  @ApiNotFoundResponse({ description: 'Storefront not found' })
  getActiveStoreContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storeId') storeId: string,
  ): Promise<SellerStorefrontResponseDto> {
    return this.sellerStorefrontsService.getActiveStoreContext(
      user.sub,
      storeId,
    );
  }
}
