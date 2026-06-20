import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VisibilityStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  buildProductCategoryTree,
  mapBusinessCategory,
  mapProductCategory,
  slugifyCategoryName,
} from './category.mapper';
import {
  BusinessCategoryResponseDto,
  ProductCategoryResponseDto,
  ProductCategoryTreeNodeDto,
} from './dto/category-response.dto';
import {
  CreateBusinessCategoryInput,
  CreateProductCategoryInput,
  UpdateBusinessCategoryInput,
  UpdateProductCategoryInput,
} from './dto/category.dto';

/**
 * Handles business categories, product categories, and recursive tree reads.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an active seller business category.
   *
   * @param input - Validated business category payload.
   * @returns Created business category.
   * @throws ConflictException when the name already exists.
   */
  async createBusinessCategory(
    input: CreateBusinessCategoryInput,
  ): Promise<BusinessCategoryResponseDto> {
    await this.assertBusinessCategoryNameAvailable(input.name);

    const category = await this.prisma.businessCategory.create({
      data: {
        name: input.name,
        description: input.description,
        status: VisibilityStatus.ACTIVE,
      },
    });

    return mapBusinessCategory(category);
  }

  /**
   * Updates a business category.
   *
   * @param categoryId - Business category ID.
   * @param input - Validated update payload.
   * @returns Updated business category.
   * @throws NotFoundException when the category is missing.
   * @throws ConflictException when the new name already exists.
   */
  async updateBusinessCategory(
    categoryId: string,
    input: UpdateBusinessCategoryInput,
  ): Promise<BusinessCategoryResponseDto> {
    const existing = await this.getBusinessCategoryOrThrow(categoryId);

    if (input.name && input.name !== existing.name) {
      await this.assertBusinessCategoryNameAvailable(input.name);
    }

    const category = await this.prisma.businessCategory.update({
      where: { id: categoryId },
      data: input,
    });

    return mapBusinessCategory(category);
  }

  /**
   * Hides a business category from public usage.
   *
   * @param categoryId - Business category ID.
   * @returns Hidden business category.
   * @throws NotFoundException when the category is missing.
   */
  async hideBusinessCategory(
    categoryId: string,
  ): Promise<BusinessCategoryResponseDto> {
    await this.getBusinessCategoryOrThrow(categoryId);

    const category = await this.prisma.businessCategory.update({
      where: { id: categoryId },
      data: { status: VisibilityStatus.HIDDEN },
    });

    return mapBusinessCategory(category);
  }

  /**
   * Lists active business categories for public seller onboarding flows.
   *
   * @returns Active business categories sorted by name.
   */
  async listPublicBusinessCategories(): Promise<BusinessCategoryResponseDto[]> {
    const categories = await this.prisma.businessCategory.findMany({
      where: { status: VisibilityStatus.ACTIVE },
      orderBy: { name: 'asc' },
    });

    return categories.map((category) => mapBusinessCategory(category));
  }

  /**
   * Creates an active product category.
   *
   * Root categories are level 1. Child levels are derived from the parent.
   *
   * @param input - Validated product category payload.
   * @returns Created product category.
   * @throws ConflictException when the generated slug already exists.
   * @throws NotFoundException when a parent category is missing.
   */
  async createProductCategory(
    input: CreateProductCategoryInput,
  ): Promise<ProductCategoryResponseDto> {
    const slug = slugifyCategoryName(input.name);
    await this.assertProductCategorySlugAvailable(slug);

    const parent = input.parentCategoryId
      ? await this.getProductCategoryOrThrow(input.parentCategoryId)
      : null;

    const category = await this.prisma.category.create({
      data: {
        name: input.name,
        slug,
        parentCategoryId: input.parentCategoryId,
        level: parent ? parent.level + 1 : 1,
        description: input.description,
        status: VisibilityStatus.ACTIVE,
      },
    });

    return mapProductCategory(category);
  }

  /**
   * Updates a product category.
   *
   * @param categoryId - Product category ID.
   * @param input - Validated update payload.
   * @returns Updated product category.
   * @throws NotFoundException when the category or parent is missing.
   * @throws ConflictException when a new generated slug already exists.
   */
  async updateProductCategory(
    categoryId: string,
    input: UpdateProductCategoryInput,
  ): Promise<ProductCategoryResponseDto> {
    const existing = await this.getProductCategoryOrThrow(categoryId);
    const data: {
      name?: string;
      slug?: string;
      parentCategoryId?: string;
      level?: number;
      description?: string;
    } = {};

    if (input.name && input.name !== existing.name) {
      data.name = input.name;
      data.slug = slugifyCategoryName(input.name);
      await this.assertProductCategorySlugAvailable(data.slug);
    }

    if (input.description !== undefined) {
      data.description = input.description;
    }

    if (input.parentCategoryId !== undefined) {
      const parent = await this.getProductCategoryOrThrow(
        input.parentCategoryId,
      );
      data.parentCategoryId = input.parentCategoryId;
      data.level = parent.level + 1;
    }

    const category = await this.prisma.category.update({
      where: { id: categoryId },
      data,
    });

    return mapProductCategory(category);
  }

  /**
   * Hides a product category from public marketplace discovery.
   *
   * @param categoryId - Product category ID.
   * @returns Hidden product category.
   * @throws NotFoundException when the category is missing.
   */
  async hideProductCategory(
    categoryId: string,
  ): Promise<ProductCategoryResponseDto> {
    await this.getProductCategoryOrThrow(categoryId);

    const category = await this.prisma.category.update({
      where: { id: categoryId },
      data: { status: VisibilityStatus.HIDDEN },
    });

    return mapProductCategory(category);
  }

  /**
   * Returns the public active product category tree.
   *
   * @returns Recursive tree containing active product categories only.
   */
  async getPublicProductCategoryTree(): Promise<ProductCategoryTreeNodeDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { status: VisibilityStatus.ACTIVE },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    return buildProductCategoryTree(
      categories.filter(
        (category) => category.status === VisibilityStatus.ACTIVE,
      ),
    );
  }

  private async getBusinessCategoryOrThrow(categoryId: string) {
    const category = await this.prisma.businessCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Business category not found');
    }

    return category;
  }

  private async getProductCategoryOrThrow(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Product category not found');
    }

    return category;
  }

  private async assertBusinessCategoryNameAvailable(
    name: string,
  ): Promise<void> {
    const existing = await this.prisma.businessCategory.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ConflictException('Business category already exists');
    }
  }

  private async assertProductCategorySlugAvailable(
    slug: string,
  ): Promise<void> {
    const existing = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException('Product category already exists');
    }
  }
}
