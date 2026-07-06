/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/unbound-method */
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  DeliveryMethod,
  DeliveryProvider,
  DeliveryStatus,
  EscrowStatus,
  KycStatus,
  OrderItemStatus,
  ProductStatus,
  StoreStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DeliveryService } from './delivery.service';
import { DeliveryProviderPort } from './providers/delivery-provider.interface';

describe('DeliveryService', () => {
  const buyerProfile = {
    id: 'buyer_profile_one',
    userId: 'buyer_user',
    fullName: 'Ada Buyer',
    phoneNumber: '08012345678',
  };
  const address = {
    id: 'address_one',
    buyerProfileId: 'buyer_profile_one',
    contactName: 'Ada Buyer',
    phoneNumber: '08012345678',
    state: 'Lagos',
    city: 'Ikeja',
    streetAddress: '12 Allen Avenue',
    deliveryNotes: null,
    isDefault: true,
    createdAt: new Date('2026-07-06T08:00:00.000Z'),
    updatedAt: new Date('2026-07-06T08:00:00.000Z'),
  };
  const product = {
    id: 'product_one',
    sellerProfileId: 'store_one',
    title: 'Phone',
    priceKobo: BigInt(10000),
    stockQuantity: 5,
    status: ProductStatus.LIVE,
    isActive: true,
    deletedAt: null,
    sellerProfile: {
      id: 'store_one',
      businessName: 'Tech Store',
      baseLocation: 'Yaba',
      kycStatus: KycStatus.VERIFIED,
      status: StoreStatus.ACTIVE,
    },
  };
  const quote = {
    id: 'quote_one',
    buyerProfileId: 'buyer_profile_one',
    productId: 'product_one',
    sellerProfileId: 'store_one',
    provider: DeliveryProvider.DELLYMAN,
    providerQuoteReference: 'provider_quote_one',
    providerCompanyId: null,
    providerCompanyName: null,
    vehicle: 'Bike',
    pickupState: 'Yaba',
    pickupCity: null,
    pickupAddress: 'Tech Store, Yaba',
    dropoffState: 'Lagos',
    dropoffCity: 'Ikeja',
    dropoffAddress: '12 Allen Avenue, Ikeja, Lagos',
    quantity: 2,
    packageWeightKg: null,
    quotedFeeKobo: BigInt(2500),
    estimatedPickupAt: null,
    estimatedDeliveryAt: null,
    expiresAt: new Date('2026-07-06T08:30:00.000Z'),
    metadata: null,
    createdAt: new Date('2026-07-06T08:00:00.000Z'),
  };

  let prisma: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;
  let provider: jest.Mocked<DeliveryProviderPort>;
  let service: DeliveryService;

  beforeEach(() => {
    prisma = {
      buyerProfile: { findUnique: jest.fn().mockResolvedValue(buyerProfile) },
      buyerAddress: { findFirst: jest.fn().mockResolvedValue(address) },
      product: { findUnique: jest.fn().mockResolvedValue(product) },
      deliveryQuote: { create: jest.fn().mockResolvedValue(quote) },
      orderItem: { findUnique: jest.fn(), update: jest.fn() },
      deliveryShipment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      deliveryEvent: { create: jest.fn(), upsert: jest.fn() },
      platformSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      order: { updateMany: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: PrismaService) => unknown) =>
        callback(prisma),
      ),
    } as unknown as jest.Mocked<PrismaService>;
    configService = {
      getOrThrow: jest.fn().mockReturnValue({
        provider: DeliveryProvider.DELLYMAN,
        defaultVehicle: 'Bike',
        quoteTtlMinutes: 30,
      }),
    } as unknown as jest.Mocked<ConfigService>;
    provider = {
      listStates: jest.fn().mockResolvedValue([{ id: '1', name: 'Lagos' }]),
      listCities: jest.fn().mockResolvedValue([{ id: '10', name: 'Ikeja' }]),
      listCarriers: jest.fn().mockResolvedValue([{ id: '1', name: 'Bike' }]),
      getQuote: jest.fn().mockResolvedValue({
        amountKobo: BigInt(2500),
        providerQuoteReference: 'provider_quote_one',
        vehicle: 'Bike',
      }),
      bookDelivery: jest.fn(),
      trackDelivery: jest.fn(),
      mapWebhook: jest.fn(),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
    };
    service = new DeliveryService(prisma, configService, provider);
  });

  it('creates and stores a provider delivery quote for checkout', async () => {
    const result = await service.createQuote('buyer_user', {
      productId: 'product_one',
      quantity: 2,
      deliveryAddressId: 'address_one',
    });

    expect(provider.getQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        pickupAddress: 'Tech Store, Yaba',
        dropoffAddress: '12 Allen Avenue, Ikeja, Lagos',
        quantity: 2,
        vehicle: 'Bike',
      }),
    );
    expect(prisma.deliveryQuote.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buyerProfileId: 'buyer_profile_one',
        productId: 'product_one',
        sellerProfileId: 'store_one',
        quotedFeeKobo: BigInt(2500),
      }),
    });
    expect(result.quotedFeeKobo).toBe('2500');
  });

  it('rejects quote when buyer address is missing', async () => {
    prisma.buyerAddress.findFirst.mockResolvedValue(null);

    await expect(
      service.createQuote('buyer_user', {
        productId: 'product_one',
        quantity: 1,
        deliveryAddressId: 'missing_address',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('books provider delivery for an escrow-held seller order item', async () => {
    prisma.orderItem.findUnique.mockResolvedValue({
      id: 'order_item_one',
      orderId: 'order_one',
      orderReference: undefined,
      quantity: 2,
      status: OrderItemStatus.AWAITING_DISPATCH,
      sellerProfile: {
        id: 'store_one',
        userId: 'seller_user',
        businessName: 'Tech Store',
        baseLocation: 'Yaba',
        user: { phoneNumber: '08022222222' },
      },
      deliveryQuote: quote,
      deliveryShipment: null,
      escrow: { id: 'escrow_one', status: EscrowStatus.HELD },
      product: { title: 'Phone' },
      order: {
        orderReference: 'ORD-1',
        buyerProfile: {
          fullName: 'Ada Buyer',
          phoneNumber: '08012345678',
          user: { phoneNumber: '08012345678' },
        },
      },
    });
    provider.bookDelivery.mockResolvedValue({
      status: DeliveryStatus.BOOKED,
      trackingReference: 'TRACK-1',
    });
    prisma.deliveryShipment.create.mockResolvedValue({
      id: 'shipment_one',
      orderItemId: 'order_item_one',
      provider: DeliveryProvider.DELLYMAN,
      method: DeliveryMethod.THIRD_PARTY_PROVIDER,
      status: DeliveryStatus.BOOKED,
      providerShipmentReference: null,
      providerOrderId: null,
      providerOrderCode: null,
      providerPackageId: null,
      trackingReference: 'TRACK-1',
      packageTrackingReference: null,
      deliveryFeeKobo: BigInt(2500),
      pickupAddressSnapshot: null,
      dropoffAddressSnapshot: null,
      readyForPickupAt: new Date('2026-07-06T08:00:00.000Z'),
      bookedAt: new Date('2026-07-06T08:00:00.000Z'),
      pickedUpAt: null,
      arrivedAtDestinationAt: null,
      acceptedAt: null,
      rejectedAt: null,
      returnedAt: null,
      failedAt: null,
      cancelledAt: null,
      metadata: null,
      createdAt: new Date('2026-07-06T08:00:00.000Z'),
      updatedAt: new Date('2026-07-06T08:00:00.000Z'),
    });

    const result = await service.bookOrderItemDelivery(
      'seller_user',
      'order_item_one',
    );

    expect(provider.bookDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        orderReference: 'ORD-1',
        deliveryFeeKobo: BigInt(2500),
      }),
    );
    expect(result.status).toBe(DeliveryStatus.BOOKED);
  });

  it('rejects booking when escrow is not held', async () => {
    prisma.orderItem.findUnique.mockResolvedValue({
      id: 'order_item_one',
      status: OrderItemStatus.AWAITING_DISPATCH,
      sellerProfile: { userId: 'seller_user' },
      deliveryShipment: null,
      escrow: { status: EscrowStatus.FUNDED },
    });

    await expect(
      service.bookOrderItemDelivery('seller_user', 'order_item_one'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
