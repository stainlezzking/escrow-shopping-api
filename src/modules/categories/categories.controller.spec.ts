/* eslint-disable @typescript-eslint/unbound-method */
import { UserRole } from '@prisma/client';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  const adminUser = {
    sub: 'admin_user',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  it('delegates public business category listing to the service', async () => {
    const service = {
      listPublicBusinessCategories: jest
        .fn()
        .mockResolvedValue([{ id: 'business_category_one' }]),
    } as unknown as jest.Mocked<CategoriesService>;
    const controller = new CategoriesController(service);

    await expect(controller.listPublicBusinessCategories()).resolves.toEqual([
      { id: 'business_category_one' },
    ]);
    expect(service.listPublicBusinessCategories).toHaveBeenCalled();
  });

  it('delegates public category tree lookup to the service', async () => {
    const service = {
      getPublicProductCategoryTree: jest
        .fn()
        .mockResolvedValue([{ id: 'category_root', children: [] }]),
    } as unknown as jest.Mocked<CategoriesService>;
    const controller = new CategoriesController(service);

    await expect(controller.getPublicProductCategoryTree()).resolves.toEqual([
      { id: 'category_root', children: [] },
    ]);
    expect(service.getPublicProductCategoryTree).toHaveBeenCalled();
  });

  it('delegates admin business category creation to the service', async () => {
    const service = {
      createBusinessCategory: jest
        .fn()
        .mockResolvedValue({ id: 'business_category_one' }),
    } as unknown as jest.Mocked<CategoriesService>;
    const controller = new CategoriesController(service);

    await expect(
      controller.createBusinessCategory(adminUser, {
        name: 'Electronics',
      }),
    ).resolves.toEqual({ id: 'business_category_one' });
    expect(service.createBusinessCategory).toHaveBeenCalledWith({
      name: 'Electronics',
    });
  });

  it('delegates admin product category creation and updates to the service', async () => {
    const service = {
      createProductCategory: jest
        .fn()
        .mockResolvedValue({ id: 'category_one' }),
      updateProductCategory: jest
        .fn()
        .mockResolvedValue({ id: 'category_one' }),
      hideProductCategory: jest.fn().mockResolvedValue({ id: 'category_one' }),
    } as unknown as jest.Mocked<CategoriesService>;
    const controller = new CategoriesController(service);

    await controller.createProductCategory(adminUser, { name: 'Phones' });
    await controller.updateProductCategory(
      adminUser,
      { categoryId: 'category_one' },
      { name: 'Smartphones' },
    );
    await controller.hideProductCategory(adminUser, {
      categoryId: 'category_one',
    });

    expect(service.createProductCategory).toHaveBeenCalledWith({
      name: 'Phones',
    });
    expect(service.updateProductCategory).toHaveBeenCalledWith('category_one', {
      name: 'Smartphones',
    });
    expect(service.hideProductCategory).toHaveBeenCalledWith('category_one');
  });
});
