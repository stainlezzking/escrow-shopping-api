import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ApiResponseOptions } from '../../common/responses/api-response';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  ProductImageResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import {
  CreateProductDto,
  CreateProductSchema,
  ProductParamsSchema,
  ProductSearchQuerySchema,
  StoreProductsParamsSchema,
  UpdateProductDto,
  UpdateProductSchema,
  UploadProductImageDto,
  UploadProductImageSchema,
} from './dto/product.dto';
import type {
  CreateProductInput,
  ProductParamsInput,
  ProductSearchQueryInput,
  StoreProductsParamsInput,
  UpdateProductInput,
  UploadProductImageInput,
} from './dto/product.dto';
import { ProductsService } from './products.service';

/**
 * Handles seller product management and public product discovery routes.
 */
@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Creates a seller product.
   */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: 'Create seller product' })
  @ApiBody({ type: CreateProductDto })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Seller role or ownership required' })
  @ApiConflictResponse({ description: 'Product slug already exists' })
  createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductInput,
  ): Promise<ProductResponseDto> {
    return this.productsService.createProduct(user.sub, dto);
  }

  /**
   * Updates a seller-owned product.
   */
  @Patch(':productId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: 'Update seller product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiBody({ type: UpdateProductDto })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Seller ownership required' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  updateProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(ProductParamsSchema))
    params: ProductParamsInput,
    @Body(new ZodValidationPipe(UpdateProductSchema)) dto: UpdateProductInput,
  ): Promise<ProductResponseDto> {
    return this.productsService.updateProduct(user.sub, params.productId, dto);
  }

  /**
   * Stores product image metadata after uploading the object to MinIO.
   */
  @Post(':productId/images')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: 'Upload product image metadata' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiBody({ type: UploadProductImageDto })
  @ApiCreatedResponse({ type: ProductImageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Seller ownership required' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  uploadProductImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(ProductParamsSchema))
    params: ProductParamsInput,
    @Body(new ZodValidationPipe(UploadProductImageSchema))
    dto: UploadProductImageInput,
  ): Promise<ProductImageResponseDto> {
    return this.productsService.uploadProductImage(
      user.sub,
      params.productId,
      dto,
    );
  }

  /**
   * Searches public marketplace products.
   */
  @Get()
  @ApiOperation({ summary: 'Search public products' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  searchPublicProducts(
    @Query(new ZodValidationPipe(ProductSearchQuerySchema))
    query: ProductSearchQueryInput,
  ): Promise<ApiResponseOptions<ProductResponseDto[]>> {
    return this.productsService.searchPublicProducts(query);
  }

  /**
   * Lists public products for a store handle.
   */
  @Get('stores/:storeHandle/products')
  @ApiOperation({ summary: 'List public store products' })
  @ApiParam({ name: 'storeHandle', description: 'Store handle' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Store not found' })
  listPublicStoreProducts(
    @Param(new ZodValidationPipe(StoreProductsParamsSchema))
    params: StoreProductsParamsInput,
    @Query(new ZodValidationPipe(ProductSearchQuerySchema))
    query: ProductSearchQueryInput,
  ): Promise<ApiResponseOptions<ProductResponseDto[]>> {
    return this.productsService.listPublicStoreProducts(
      params.storeHandle,
      query,
    );
  }

  /**
   * Gets public product details.
   */
  @Get(':productId')
  @ApiOperation({ summary: 'Get public product details' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found' })
  getPublicProductDetails(
    @Param(new ZodValidationPipe(ProductParamsSchema))
    params: ProductParamsInput,
  ): Promise<ProductResponseDto> {
    return this.productsService.getPublicProductDetails(params.productId);
  }
}
