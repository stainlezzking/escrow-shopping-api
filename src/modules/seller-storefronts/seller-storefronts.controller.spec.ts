/* eslint-disable @typescript-eslint/unbound-method */
import { SellerStorefrontsController } from './seller-storefronts.controller';
import { SellerStorefrontsService } from './seller-storefronts.service';

describe('SellerStorefrontsController', () => {
  it('delegates storefront creation to the service with the current user id', async () => {
    const service = {
      createStorefront: jest.fn().mockResolvedValue({ id: 'store_one' }),
    } as unknown as jest.Mocked<SellerStorefrontsService>;
    const controller = new SellerStorefrontsController(service);

    await expect(
      controller.createStorefront(
        { sub: 'user_one', email: 'seller@example.com', role: 'SELLER' },
        {
          businessName: 'Tech Haven',
          storeHandle: 'tech-haven',
          bankName: 'Access Bank',
          accountNumber: '0123456789',
          accountName: 'Ada Buyer',
        },
      ),
    ).resolves.toEqual({ id: 'store_one' });
    expect(service.createStorefront).toHaveBeenCalledWith('user_one', {
      businessName: 'Tech Haven',
      storeHandle: 'tech-haven',
      bankName: 'Access Bank',
      accountNumber: '0123456789',
      accountName: 'Ada Buyer',
    });
  });

  it('delegates owned storefront listing to the service', async () => {
    const service = {
      listOwnedStorefronts: jest.fn().mockResolvedValue([{ id: 'store_one' }]),
    } as unknown as jest.Mocked<SellerStorefrontsService>;
    const controller = new SellerStorefrontsController(service);

    await expect(
      controller.listOwnedStorefronts({
        sub: 'user_one',
        email: 'seller@example.com',
        role: 'SELLER',
      }),
    ).resolves.toEqual([{ id: 'store_one' }]);
    expect(service.listOwnedStorefronts).toHaveBeenCalledWith('user_one');
  });

  it('delegates active store context lookup to the service', async () => {
    const service = {
      getActiveStoreContext: jest.fn().mockResolvedValue({ id: 'store_one' }),
    } as unknown as jest.Mocked<SellerStorefrontsService>;
    const controller = new SellerStorefrontsController(service);

    await expect(
      controller.getActiveStoreContext(
        { sub: 'user_one', email: 'seller@example.com', role: 'SELLER' },
        'store_one',
      ),
    ).resolves.toEqual({ id: 'store_one' });
    expect(service.getActiveStoreContext).toHaveBeenCalledWith(
      'user_one',
      'store_one',
    );
  });
});
