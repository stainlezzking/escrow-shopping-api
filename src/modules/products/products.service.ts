import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { KycStatus, ProductStatus, StoreStatus } from '@prisma/client';
import {
  ApiResponseOptions,
  createPaginationMeta,
  paginatedResponse,
} from '../../common/responses/api-response';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';
import {
  ProductImageResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import {
  CreateProductInput,
  ProductSearchQueryInput,
  UpdateProductInput,
  UploadProductImageInput,
} from './dto/product.dto';
import {
  mapProduct,
  mapProductImage,
  slugifyProductTitle,
} from './product.mapper';

const productInclude = {
  sellerProfile: true,
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
  },
  categories: { include: { category: true } },
};

const publicProductWhere = {
  status: ProductStatus.LIVE,
  isActive: true,
  deletedAt: null,
  sellerProfile: {
    kycStatus: KycStatus.VERIFIED,
    status: StoreStatus.ACTIVE,
  },
} as const;

/**
 * Handles seller product management and public product discovery.
 */
@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Creates a draft product under a seller-owned storefront.
   *
   * @param userId - Authenticated seller user ID.
   * @param input - Validated product creation payload.
   * @returns Created product response.
   * @throws ForbiddenException when the store belongs to another user.
   * @throws ConflictException when the seller already has the generated slug.
   */
  async createProduct(
    userId: string,
    input: CreateProductInput,
  ): Promise<ProductResponseDto> {
    await this.assertSellerOwnsProfile(userId, input.sellerProfileId);
    const slug = slugifyProductTitle(input.title);
    await this.assertSellerProductSlugAvailable(input.sellerProfileId, slug);
    await this.assertCategoriesExist(input.categoryIds);

    const product = await this.prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          sellerProfileId: input.sellerProfileId,
          title: input.title,
          slug,
          description: input.description,
          priceKobo: input.priceKobo,
          stockQuantity: input.stockQuantity,
          status: ProductStatus.DRAFT,
        },
        include: productInclude,
      });

      if (input.categoryIds?.length) {
        await tx.productCategory.createMany({
          data: input.categoryIds.map((categoryId) => ({
            productId: createdProduct.id,
            categoryId,
          })),
          skipDuplicates: true,
        });
      }

      return createdProduct;
    });

    this.logger.log(
      `Product created for seller profile ${input.sellerProfileId}: ${product.id}`,
    );

    return mapProduct(product);
  }

  /**
   * Updates a seller-owned product.
   *
   * @param userId - Authenticated seller user ID.
   * @param productId - Product ID to update.
   * @param input - Validated update payload.
   * @returns Updated product response.
   * @throws NotFoundException when the product is missing.
   * @throws ForbiddenException when the product belongs to another seller.
   */
  async updateProduct(
    userId: string,
    productId: string,
    input: UpdateProductInput,
  ): Promise<ProductResponseDto> {
    const existingProduct = await this.getSellerProductOrThrow(productId);
    this.assertSellerOwnsProduct(userId, existingProduct);
    await this.assertCategoriesExist(input.categoryIds);

    const data: {
      title?: string;
      slug?: string;
      description?: string;
      priceKobo?: bigint;
      stockQuantity?: number;
      status?: ProductStatus;
      isActive?: boolean;
    } = {};

    if (input.title && input.title !== existingProduct.title) {
      data.title = input.title;
      data.slug = slugifyProductTitle(input.title);
      await this.assertUpdatedSlugAvailable(
        existingProduct.sellerProfileId,
        productId,
        data.slug,
      );
    }

    if (input.description !== undefined) data.description = input.description;
    if (input.priceKobo !== undefined) data.priceKobo = input.priceKobo;
    if (input.stockQuantity !== undefined)
      data.stockQuantity = input.stockQuantity;
    if (input.status !== undefined) data.status = input.status;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const product = await this.prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data,
        include: productInclude,
      });

      if (input.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId } });
        if (input.categoryIds.length) {
          await tx.productCategory.createMany({
            data: input.categoryIds.map((categoryId) => ({
              productId,
              categoryId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return updatedProduct;
    });

    this.logger.log(`Product updated: ${productId}`);

    return mapProduct(product);
  }

  /**
   * Stores product image metadata after the object is uploaded to MinIO.
   *
   * @param userId - Authenticated seller user ID.
   * @param productId - Product ID receiving the image.
   * @param input - Validated image metadata.
   * @returns Created image metadata response.
   */
  async uploadProductImage(
    userId: string,
    productId: string,
    input: UploadProductImageInput,
  ): Promise<ProductImageResponseDto> {
    const product = await this.getSellerProductOrThrow(productId);
    this.assertSellerOwnsProduct(userId, product);
    const imageUrl = this.storageService.buildProductImageUrl(input.storageKey);
    const isPrimary = input.isPrimary === true;

    const image = await this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.productImage.updateMany({
          where: { productId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.productImage.create({
        data: {
          productId,
          imageUrl,
          storageKey: input.storageKey,
          isPrimary,
          sortOrder: input.sortOrder,
        },
      });
    });

    this.logger.log(`Product image metadata stored for product ${productId}`);

    return mapProductImage(image);
  }

  /**
   * Searches public marketplace products using visibility rules.
   *
   * @param query - Validated search filters and pagination.
   * @returns Paginated public product response.
   */
  async searchPublicProducts(
    query: ProductSearchQueryInput,
  ): Promise<ApiResponseOptions<ProductResponseDto[]>> {
    const where = this.buildPublicProductWhere(query);
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return paginatedResponse(
      products.map((product) => mapProduct(product)),
      createPaginationMeta(query.page, query.limit, total),
    );
  }

  /**
   * Gets public product details only when visibility rules pass.
   *
   * @param productId - Product ID.
   * @returns Public product response.
   * @throws NotFoundException when no public-visible product matches.
   */
  async getPublicProductDetails(
    productId: string,
  ): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findFirst({
      where: { ...publicProductWhere, id: productId },
      include: productInclude,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return mapProduct(product);
  }

  /**
   * Lists public products for an active, verified store.
   *
   * @param storeHandle - Public seller store handle.
   * @param query - Validated pagination and optional filters.
   * @returns Paginated public product response.
   */
  async listPublicStoreProducts(
    storeHandle: string,
    query: ProductSearchQueryInput,
  ): Promise<ApiResponseOptions<ProductResponseDto[]>> {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { storeHandle },
    });

    if (
      !sellerProfile ||
      sellerProfile.kycStatus !== KycStatus.VERIFIED ||
      sellerProfile.status !== StoreStatus.ACTIVE
    ) {
      throw new NotFoundException('Store not found');
    }

    const where = {
      ...this.buildPublicProductWhere(query),
      sellerProfileId: sellerProfile.id,
    };
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return paginatedResponse(
      products.map((product) => mapProduct(product)),
      createPaginationMeta(query.page, query.limit, total),
    );
  }

  private buildPublicProductWhere(query: ProductSearchQueryInput) {
    return {
      ...publicProductWhere,
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' as const } },
              {
                description: {
                  contains: query.q,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(query.categoryId
        ? { categories: { some: { categoryId: query.categoryId } } }
        : {}),
    };
  }

  private async assertSellerOwnsProfile(
    userId: string,
    sellerProfileId: string,
  ): Promise<void> {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
    });

    if (!sellerProfile) {
      throw new NotFoundException('Seller profile not found');
    }

    if (sellerProfile.userId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to manage this seller profile',
      );
    }
  }

  private async getSellerProductOrThrow(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { sellerProfile: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private assertSellerOwnsProduct(
    userId: string,
    product: { sellerProfile?: { userId: string } | null },
  ): void {
    if (product.sellerProfile?.userId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to manage this product',
      );
    }
  }

  private async assertSellerProductSlugAvailable(
    sellerProfileId: string,
    slug: string,
  ): Promise<void> {
    const existing = await this.prisma.product.findUnique({
      where: { sellerProfileId_slug: { sellerProfileId, slug } },
    });

    if (existing) {
      throw new ConflictException('Product already exists for this store');
    }
  }

  private async assertUpdatedSlugAvailable(
    sellerProfileId: string,
    productId: string,
    slug: string,
  ): Promise<void> {
    const existing = await this.prisma.product.findFirst({
      where: { sellerProfileId, slug, id: { not: productId } },
    });

    if (existing) {
      throw new ConflictException('Product already exists for this store');
    }
  }

  private async assertCategoriesExist(categoryIds: string[] | undefined) {
    if (!categoryIds?.length) {
      return;
    }

    const uniqueIds = [...new Set(categoryIds)];
    const count = await this.prisma.category.count({
      where: { id: { in: uniqueIds } },
    });

    if (count !== uniqueIds.length) {
      throw new NotFoundException('One or more categories were not found');
    }
  }
}
