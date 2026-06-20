/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { KycStatus, ProductStatus, StoreStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const now = new Date('2026-06-20T13:00:00.000Z');
  const sellerProfile = {
    id: 'store_one',
    userId: 'seller_user',
    businessName: 'Tech Haven',
    storeHandle: 'tech-haven',
    kycStatus: KycStatus.VERIFIED,
    status: StoreStatus.ACTIVE,
  };
  const productRecord = {
    id: 'product_one',
    sellerProfileId: 'store_one',
    title: 'iPhone 15',
    slug: 'iphone-15',
    description: 'Clean device',
    priceKobo: BigInt(250000000),
    stockQuantity: 4,
    status: ProductStatus.LIVE,
    viewCount: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    sellerProfile,
    images: [],
    categories: [],
  };
  const imageRecord = {
    id: 'image_one',
    productId: 'product_one',
    imageUrl:
      'http://localhost:9000/escrova-product-images/products/store-one/phone.png',
    storageKey: 'products/store-one/phone.png',
    isPrimary: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };

  let tx: {
    product: { create: jest.Mock; update: jest.Mock };
    productCategory: { createMany: jest.Mock; deleteMany: jest.Mock };
    productImage: { updateMany: jest.Mock; create: jest.Mock };
  };
  let prisma: jest.Mocked<PrismaService>;
  let storage: jest.Mocked<StorageService>;
  let service: ProductsService;

  beforeEach(() => {
    tx = {
      product: {
        create: jest.fn().mockResolvedValue(productRecord),
        update: jest.fn().mockResolvedValue(productRecord),
      },
      productCategory: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      productImage: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue(imageRecord),
      },
    };

    prisma = {
      sellerProfile: { findUnique: jest.fn() },
      product: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      category: { count: jest.fn() },
      productImage: { create: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(async (callback) => callback(tx)),
    } as unknown as jest.Mocked<PrismaService>;
    storage = {
      buildProductImageUrl: jest
        .fn()
        .mockReturnValue(
          'http://localhost:9000/escrova-product-images/products/store-one/phone.png',
        ),
    } as unknown as jest.Mocked<StorageService>;
    service = new ProductsService(prisma, storage);
  });

  it('creates a seller-owned product with category links', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue(sellerProfile);
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.category.count.mockResolvedValue(1);

    const result = await service.createProduct('seller_user', {
      sellerProfileId: 'store_one',
      title: 'iPhone 15',
      description: 'Clean device',
      priceKobo: BigInt(250000000),
      stockQuantity: 4,
      categoryIds: ['category_one'],
    });

    expect(tx.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sellerProfileId: 'store_one',
        title: 'iPhone 15',
        slug: 'iphone-15',
        priceKobo: BigInt(250000000),
        status: ProductStatus.DRAFT,
      }),
      include: expect.any(Object),
    });
    expect(tx.productCategory.createMany).toHaveBeenCalledWith({
      data: [{ productId: 'product_one', categoryId: 'category_one' }],
      skipDuplicates: true,
    });
    expect(result.priceKobo).toBe('250000000');
  });

  it('rejects product creation for another seller store', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue({
      ...sellerProfile,
      userId: 'other_user',
    });

    await expect(
      service.createProduct('seller_user', {
        sellerProfileId: 'store_one',
        title: 'iPhone 15',
        priceKobo: BigInt(250000000),
        stockQuantity: 4,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects duplicate seller product slugs', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue(sellerProfile);
    prisma.product.findUnique.mockResolvedValue(productRecord);

    await expect(
      service.createProduct('seller_user', {
        sellerProfileId: 'store_one',
        title: 'iPhone 15',
        priceKobo: BigInt(250000000),
        stockQuantity: 4,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates only seller-owned products', async () => {
    prisma.product.findUnique.mockResolvedValue(productRecord);
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.category.count.mockResolvedValue(1);

    await service.updateProduct('seller_user', 'product_one', {
      title: 'iPhone 15 Pro',
      categoryIds: ['category_one'],
    });

    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'product_one' },
      data: { title: 'iPhone 15 Pro', slug: 'iphone-15-pro' },
      include: expect.any(Object),
    });
    expect(tx.productCategory.deleteMany).toHaveBeenCalledWith({
      where: { productId: 'product_one' },
    });
  });

  it('uploads image metadata using a MinIO-derived URL', async () => {
    prisma.product.findUnique.mockResolvedValue(productRecord);

    const result = await service.uploadProductImage(
      'seller_user',
      'product_one',
      {
        storageKey: 'products/store-one/phone.png',
        isPrimary: true,
        sortOrder: 0,
      },
    );

    expect(storage.buildProductImageUrl).toHaveBeenCalledWith(
      'products/store-one/phone.png',
    );
    expect(tx.productImage.updateMany).toHaveBeenCalledWith({
      where: { productId: 'product_one', isPrimary: true },
      data: { isPrimary: false },
    });
    expect(tx.productImage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'product_one',
        storageKey: 'products/store-one/phone.png',
        imageUrl:
          'http://localhost:9000/escrova-product-images/products/store-one/phone.png',
      }),
    });
    expect(result.imageUrl).toContain('escrova-product-images');
  });

  it('searches only public visible verified seller products', async () => {
    prisma.product.count.mockResolvedValue(1);
    prisma.product.findMany.mockResolvedValue([productRecord]);

    const result = await service.searchPublicProducts({
      page: 1,
      limit: 20,
      q: 'iphone',
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ProductStatus.LIVE,
          isActive: true,
          deletedAt: null,
          sellerProfile: {
            kycStatus: KycStatus.VERIFIED,
            status: StoreStatus.ACTIVE,
          },
        }),
      }),
    );
    expect(result.meta.total).toBe(1);
  });

  it('returns public details only for visible verified seller products', async () => {
    prisma.product.findFirst.mockResolvedValue(productRecord);

    await expect(
      service.getPublicProductDetails('product_one'),
    ).resolves.toEqual(expect.objectContaining({ id: 'product_one' }));
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: 'product_one' }),
      include: expect.any(Object),
    });
  });

  it('rejects missing public product details', async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.getPublicProductDetails('missing_product'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists public store products for active verified stores only', async () => {
    prisma.sellerProfile.findUnique.mockResolvedValue(sellerProfile);
    prisma.product.count.mockResolvedValue(1);
    prisma.product.findMany.mockResolvedValue([productRecord]);

    const result = await service.listPublicStoreProducts('tech-haven', {
      page: 1,
      limit: 20,
    });

    expect(prisma.sellerProfile.findUnique).toHaveBeenCalledWith({
      where: { storeHandle: 'tech-haven' },
    });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sellerProfileId: 'store_one' }),
      }),
    );
    expect(result.data).toHaveLength(1);
  });
});
