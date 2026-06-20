/* eslint-disable @typescript-eslint/unbound-method */
import { UserRole } from '@prisma/client';
import { BuyerProfilesController } from './buyer-profiles.controller';
import { BuyerProfilesService } from './buyer-profiles.service';

describe('BuyerProfilesController', () => {
  const currentUser = {
    sub: 'user_one',
    email: 'buyer@example.com',
    role: UserRole.BUYER,
  };

  it('delegates own profile lookup to the service', async () => {
    const service = {
      getOwnProfile: jest.fn().mockResolvedValue({ id: 'buyer_profile_one' }),
    } as unknown as jest.Mocked<BuyerProfilesService>;
    const controller = new BuyerProfilesController(service);

    await expect(controller.getOwnProfile(currentUser)).resolves.toEqual({
      id: 'buyer_profile_one',
    });
    expect(service.getOwnProfile).toHaveBeenCalledWith('user_one');
  });

  it('delegates address creation to the service', async () => {
    const service = {
      addAddress: jest.fn().mockResolvedValue({ id: 'address_one' }),
    } as unknown as jest.Mocked<BuyerProfilesService>;
    const controller = new BuyerProfilesController(service);
    const dto = {
      contactName: 'Ada Buyer',
      state: 'Lagos',
      streetAddress: '12 Allen Avenue',
    };

    await expect(controller.addAddress(currentUser, dto)).resolves.toEqual({
      id: 'address_one',
    });
    expect(service.addAddress).toHaveBeenCalledWith('user_one', dto);
  });

  it('delegates address listing to the service', async () => {
    const service = {
      listOwnAddresses: jest.fn().mockResolvedValue([{ id: 'address_one' }]),
    } as unknown as jest.Mocked<BuyerProfilesService>;
    const controller = new BuyerProfilesController(service);

    await expect(controller.listOwnAddresses(currentUser)).resolves.toEqual([
      { id: 'address_one' },
    ]);
    expect(service.listOwnAddresses).toHaveBeenCalledWith('user_one');
  });

  it('delegates address update to the service', async () => {
    const service = {
      updateAddress: jest.fn().mockResolvedValue({ id: 'address_one' }),
    } as unknown as jest.Mocked<BuyerProfilesService>;
    const controller = new BuyerProfilesController(service);

    await expect(
      controller.updateAddress(
        currentUser,
        { addressId: 'address_one' },
        {
          city: 'Lekki',
        },
      ),
    ).resolves.toEqual({ id: 'address_one' });
    expect(service.updateAddress).toHaveBeenCalledWith(
      'user_one',
      'address_one',
      { city: 'Lekki' },
    );
  });

  it('delegates default address selection to the service', async () => {
    const service = {
      setDefaultAddress: jest.fn().mockResolvedValue({ id: 'address_one' }),
    } as unknown as jest.Mocked<BuyerProfilesService>;
    const controller = new BuyerProfilesController(service);

    await expect(
      controller.setDefaultAddress(currentUser, { addressId: 'address_one' }),
    ).resolves.toEqual({ id: 'address_one' });
    expect(service.setDefaultAddress).toHaveBeenCalledWith(
      'user_one',
      'address_one',
    );
  });
});
