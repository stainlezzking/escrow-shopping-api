/* eslint-disable @typescript-eslint/unbound-method */
import { UserRole } from '@prisma/client';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  const sellerUser = {
    sub: 'seller_user',
    email: 'seller@example.com',
    role: UserRole.SELLER,
  };

  it('delegates seller product creation and update to the service', async () => {
    const service = {
      createProduct: jest.fn().mockResolvedValue({ id: 'product_one' }),
      updateProduct: jest.fn().mockResolvedValue({ id: 'product_one' }),
    } as unknown as jest.Mocked<ProductsService>;
    const controller = new ProductsController(service);

    await controller.createProduct(sellerUser, {
      sellerProfileId: 'store_one',
      title: 'iPhone 15',
      priceKobo: BigInt(250000000),
      stockQuantity: 4,
    });
    await controller.updateProduct(
      sellerUser,
      { productId: 'product_one' },
      { title: 'iPhone 15 Pro' },
    );

    expect(service.createProduct).toHaveBeenCalledWith('seller_user', {
      sellerProfileId: 'store_one',
      title: 'iPhone 15',
      priceKobo: BigInt(250000000),
      stockQuantity: 4,
    });
    expect(service.updateProduct).toHaveBeenCalledWith(
      'seller_user',
      'product_one',
      { title: 'iPhone 15 Pro' },
    );
  });

  it('delegates image metadata upload and public reads', async () => {
    const service = {
      uploadProductImage: jest.fn().mockResolvedValue({ id: 'image_one' }),
      searchPublicProducts: jest.fn().mockResolvedValue({ data: [] }),
      getPublicProductDetails: jest
        .fn()
        .mockResolvedValue({ id: 'product_one' }),
      listPublicStoreProducts: jest.fn().mockResolvedValue({ data: [] }),
    } as unknown as jest.Mocked<ProductsService>;
    const controller = new ProductsController(service);

    await controller.uploadProductImage(
      sellerUser,
      { productId: 'product_one' },
      { storageKey: 'products/store-one/phone.png' },
    );
    await controller.searchPublicProducts({ page: 1, limit: 20 });
    await controller.getPublicProductDetails({ productId: 'product_one' });
    await controller.listPublicStoreProducts(
      { storeHandle: 'tech-haven' },
      {
        page: 1,
        limit: 20,
      },
    );

    expect(service.uploadProductImage).toHaveBeenCalledWith(
      'seller_user',
      'product_one',
      { storageKey: 'products/store-one/phone.png' },
    );
    expect(service.searchPublicProducts).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
    expect(service.getPublicProductDetails).toHaveBeenCalledWith('product_one');
    expect(service.listPublicStoreProducts).toHaveBeenCalledWith('tech-haven', {
      page: 1,
      limit: 20,
    });
  });
});
