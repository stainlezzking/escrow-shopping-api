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
import { UserRole } from '@prisma/client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CategoriesService } from './categories.service';
import {
  BusinessCategoryResponseDto,
  ProductCategoryResponseDto,
  ProductCategoryTreeNodeDto,
} from './dto/category-response.dto';
import {
  CategoryParamsSchema,
  CreateBusinessCategoryDto,
  CreateBusinessCategorySchema,
  CreateProductCategoryDto,
  CreateProductCategorySchema,
  UpdateBusinessCategoryDto,
  UpdateBusinessCategorySchema,
  UpdateProductCategoryDto,
  UpdateProductCategorySchema,
} from './dto/category.dto';
import type {
  CategoryParamsInput,
  CreateBusinessCategoryInput,
  CreateProductCategoryInput,
  UpdateBusinessCategoryInput,
  UpdateProductCategoryInput,
} from './dto/category.dto';

/**
 * Handles public and admin category routes.
 */
@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Lists active seller business categories.
   *
   * @returns Public business categories.
   */
  @Get('business')
  @ApiOperation({ summary: 'List public business categories' })
  @ApiOkResponse({ type: BusinessCategoryResponseDto, isArray: true })
  listPublicBusinessCategories(): Promise<BusinessCategoryResponseDto[]> {
    return this.categoriesService.listPublicBusinessCategories();
  }

  /**
   * Returns the active product category hierarchy.
   *
   * @returns Recursive active product category tree.
   */
  @Get('tree')
  @ApiOperation({ summary: 'Get public product category tree' })
  @ApiOkResponse({ type: ProductCategoryTreeNodeDto, isArray: true })
  getPublicProductCategoryTree(): Promise<ProductCategoryTreeNodeDto[]> {
    return this.categoriesService.getPublicProductCategoryTree();
  }

  /**
   * Creates a business category as an admin.
   *
   * @param user - Authenticated admin payload.
   * @param dto - Validated business category payload.
   * @returns Created business category.
   */
  @Post('business')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create business category' })
  @ApiBody({ type: CreateBusinessCategoryDto })
  @ApiCreatedResponse({ type: BusinessCategoryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiConflictResponse({ description: 'Business category already exists' })
  createBusinessCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateBusinessCategorySchema))
    dto: CreateBusinessCategoryInput,
  ): Promise<BusinessCategoryResponseDto> {
    void user;
    return this.categoriesService.createBusinessCategory(dto);
  }

  /**
   * Updates a business category as an admin.
   *
   * @param user - Authenticated admin payload.
   * @param params - Validated category params.
   * @param dto - Validated update payload.
   * @returns Updated business category.
   */
  @Patch('business/:categoryId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update business category' })
  @ApiParam({ name: 'categoryId', description: 'Business category ID' })
  @ApiBody({ type: UpdateBusinessCategoryDto })
  @ApiOkResponse({ type: BusinessCategoryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Business category not found' })
  updateBusinessCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(CategoryParamsSchema))
    params: CategoryParamsInput,
    @Body(new ZodValidationPipe(UpdateBusinessCategorySchema))
    dto: UpdateBusinessCategoryInput,
  ): Promise<BusinessCategoryResponseDto> {
    void user;
    return this.categoriesService.updateBusinessCategory(
      params.categoryId,
      dto,
    );
  }

  /**
   * Hides a business category as an admin.
   *
   * @param user - Authenticated admin payload.
   * @param params - Validated category params.
   * @returns Hidden business category.
   */
  @Patch('business/:categoryId/hide')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Hide business category' })
  @ApiParam({ name: 'categoryId', description: 'Business category ID' })
  @ApiOkResponse({ type: BusinessCategoryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Business category not found' })
  hideBusinessCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(CategoryParamsSchema))
    params: CategoryParamsInput,
  ): Promise<BusinessCategoryResponseDto> {
    void user;
    return this.categoriesService.hideBusinessCategory(params.categoryId);
  }

  /**
   * Creates a product category as an admin.
   *
   * @param user - Authenticated admin payload.
   * @param dto - Validated product category payload.
   * @returns Created product category.
   */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create product category' })
  @ApiBody({ type: CreateProductCategoryDto })
  @ApiCreatedResponse({ type: ProductCategoryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiConflictResponse({ description: 'Product category already exists' })
  createProductCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateProductCategorySchema))
    dto: CreateProductCategoryInput,
  ): Promise<ProductCategoryResponseDto> {
    void user;
    return this.categoriesService.createProductCategory(dto);
  }

  /**
   * Updates a product category as an admin.
   *
   * @param user - Authenticated admin payload.
   * @param params - Validated category params.
   * @param dto - Validated update payload.
   * @returns Updated product category.
   */
  @Patch(':categoryId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update product category' })
  @ApiParam({ name: 'categoryId', description: 'Product category ID' })
  @ApiBody({ type: UpdateProductCategoryDto })
  @ApiOkResponse({ type: ProductCategoryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Product category not found' })
  updateProductCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(CategoryParamsSchema))
    params: CategoryParamsInput,
    @Body(new ZodValidationPipe(UpdateProductCategorySchema))
    dto: UpdateProductCategoryInput,
  ): Promise<ProductCategoryResponseDto> {
    void user;
    return this.categoriesService.updateProductCategory(params.categoryId, dto);
  }

  /**
   * Hides a product category as an admin.
   *
   * @param user - Authenticated admin payload.
   * @param params - Validated category params.
   * @returns Hidden product category.
   */
  @Patch(':categoryId/hide')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Hide product category' })
  @ApiParam({ name: 'categoryId', description: 'Product category ID' })
  @ApiOkResponse({ type: ProductCategoryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'Product category not found' })
  hideProductCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(CategoryParamsSchema))
    params: CategoryParamsInput,
  ): Promise<ProductCategoryResponseDto> {
    void user;
    return this.categoriesService.hideProductCategory(params.categoryId);
  }
}
