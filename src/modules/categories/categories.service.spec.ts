/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VisibilityStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  const now = new Date('2026-06-20T12:00:00.000Z');
  const businessCategory = {
    id: 'business_category_one',
    name: 'Electronics',
    description: 'Gadgets and electronics',
    status: VisibilityStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };
  const rootCategory = {
    id: 'category_root',
    name: 'Phones',
    slug: 'phones',
    parentCategoryId: null,
    level: 1,
    description: 'Mobile phones',
    status: VisibilityStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };
  const childCategory = {
    id: 'category_child',
    name: 'Android Phones',
    slug: 'android-phones',
    parentCategoryId: 'category_root',
    level: 2,
    description: null,
    status: VisibilityStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };
  const hiddenCategory = {
    id: 'category_hidden',
    name: 'Hidden Phones',
    slug: 'hidden-phones',
    parentCategoryId: null,
    level: 1,
    description: null,
    status: VisibilityStatus.HIDDEN,
    createdAt: now,
    updatedAt: now,
  };

  let prisma: jest.Mocked<PrismaService>;
  let service: CategoriesService;

  beforeEach(() => {
    prisma = {
      businessCategory: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      category: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new CategoriesService(prisma);
  });

  it('creates a business category after validating name uniqueness', async () => {
    prisma.businessCategory.findUnique.mockResolvedValue(null);
    prisma.businessCategory.create.mockResolvedValue(businessCategory);

    const result = await service.createBusinessCategory({
      name: 'Electronics',
      description: 'Gadgets and electronics',
    });

    expect(prisma.businessCategory.findUnique).toHaveBeenCalledWith({
      where: { name: 'Electronics' },
    });
    expect(prisma.businessCategory.create).toHaveBeenCalledWith({
      data: {
        name: 'Electronics',
        description: 'Gadgets and electronics',
        status: VisibilityStatus.ACTIVE,
      },
    });
    expect(result).toEqual(expect.objectContaining({ name: 'Electronics' }));
  });

  it('rejects duplicate business category names', async () => {
    prisma.businessCategory.findUnique.mockResolvedValue(businessCategory);

    await expect(
      service.createBusinessCategory({ name: 'Electronics' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates and hides business categories', async () => {
    prisma.businessCategory.findUnique.mockResolvedValue(businessCategory);
    prisma.businessCategory.update.mockResolvedValue({
      ...businessCategory,
      description: 'Updated',
    });

    await expect(
      service.updateBusinessCategory('business_category_one', {
        description: 'Updated',
      }),
    ).resolves.toEqual(expect.objectContaining({ description: 'Updated' }));
    expect(prisma.businessCategory.update).toHaveBeenCalledWith({
      where: { id: 'business_category_one' },
      data: { description: 'Updated' },
    });

    prisma.businessCategory.update.mockResolvedValue({
      ...businessCategory,
      status: VisibilityStatus.HIDDEN,
    });
    await service.hideBusinessCategory('business_category_one');
    expect(prisma.businessCategory.update).toHaveBeenLastCalledWith({
      where: { id: 'business_category_one' },
      data: { status: VisibilityStatus.HIDDEN },
    });
  });

  it('lists only active public business categories', async () => {
    prisma.businessCategory.findMany.mockResolvedValue([businessCategory]);

    const result = await service.listPublicBusinessCategories();

    expect(prisma.businessCategory.findMany).toHaveBeenCalledWith({
      where: { status: VisibilityStatus.ACTIVE },
      orderBy: { name: 'asc' },
    });
    expect(result).toHaveLength(1);
  });

  it('creates a root product category with a generated slug', async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    prisma.category.create.mockResolvedValue(rootCategory);

    const result = await service.createProductCategory({
      name: 'Phones',
      description: 'Mobile phones',
    });

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        name: 'Phones',
        slug: 'phones',
        parentCategoryId: undefined,
        level: 1,
        description: 'Mobile phones',
        status: VisibilityStatus.ACTIVE,
      },
    });
    expect(result.slug).toBe('phones');
  });

  it('creates a child product category using the parent level', async () => {
    prisma.category.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(rootCategory);
    prisma.category.create.mockResolvedValue(childCategory);

    await service.createProductCategory({
      name: 'Android Phones',
      parentCategoryId: 'category_root',
    });

    expect(prisma.category.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        parentCategoryId: 'category_root',
        level: 2,
      }),
    });
  });

  it('rejects product category creation when parent is missing', async () => {
    prisma.category.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(
      service.createProductCategory({
        name: 'Android Phones',
        parentCategoryId: 'missing_parent',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and hides product categories', async () => {
    prisma.category.findUnique
      .mockResolvedValueOnce(rootCategory)
      .mockResolvedValueOnce(null);
    prisma.category.update.mockResolvedValue({
      ...rootCategory,
      name: 'Smartphones',
      slug: 'smartphones',
    });

    await service.updateProductCategory('category_root', {
      name: 'Smartphones',
    });
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'category_root' },
      data: { name: 'Smartphones', slug: 'smartphones' },
    });

    prisma.category.update.mockResolvedValue({
      ...rootCategory,
      status: VisibilityStatus.HIDDEN,
    });
    prisma.category.findUnique.mockResolvedValueOnce(rootCategory);
    await service.hideProductCategory('category_root');
    expect(prisma.category.update).toHaveBeenLastCalledWith({
      where: { id: 'category_root' },
      data: { status: VisibilityStatus.HIDDEN },
    });
  });

  it('returns a recursive public product category tree with active categories only', async () => {
    prisma.category.findMany.mockResolvedValue([
      childCategory,
      hiddenCategory,
      rootCategory,
    ]);

    const result = await service.getPublicProductCategoryTree();

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { status: VisibilityStatus.ACTIVE },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'category_root',
        children: [expect.objectContaining({ id: 'category_child' })],
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain('category_hidden');
  });
});
