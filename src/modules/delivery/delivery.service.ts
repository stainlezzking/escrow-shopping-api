import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeliveryMethod,
  DeliveryProvider,
  DeliveryStatus,
  EscrowStatus,
  OrderStatus,
  OrderItemStatus,
  Prisma,
  ProductStatus,
  StoreStatus,
  KycStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateDeliveryQuoteInput } from './dto/delivery.dto';
import {
  DeliveryCarrierOptionDto,
  DeliveryLocationOptionDto,
  DeliveryQuoteResponseDto,
  DeliveryShipmentResponseDto,
  DeliveryTrackingResponseDto,
} from './dto/delivery-response.dto';
import {
  mapDeliveryQuote,
  mapDeliveryShipment,
  mapDeliveryTracking,
} from './delivery.mapper';
import { DELIVERY_PROVIDER_PORT } from './providers/delivery-provider.interface';
import type { DeliveryProviderPort } from './providers/delivery-provider.interface';

interface DeliveryConfig {
  provider: DeliveryProvider;
  defaultVehicle: string;
  quoteTtlMinutes: number;
}

const SAFETY_TIMER_SETTING_KEY = 'order_item_safety_timer_days';
const DEFAULT_SAFETY_TIMER_DAYS = 5;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Coordinates delivery quotes, provider booking, and provider event tracking.
 */
@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(DELIVERY_PROVIDER_PORT)
    private readonly deliveryProvider: DeliveryProviderPort,
  ) {}

  /**
   * Lists delivery states supported by the configured provider.
   *
   * @returns Location options for frontend state selectors.
   */
  async listStates(): Promise<DeliveryLocationOptionDto[]> {
    return this.deliveryProvider.listStates();
  }

  /**
   * Lists cities in a provider state.
   *
   * @param stateId - Provider state identifier.
   * @returns Location options for frontend city selectors.
   */
  async listCities(stateId: string): Promise<DeliveryLocationOptionDto[]> {
    return this.deliveryProvider.listCities(stateId);
  }

  /**
   * Lists delivery carrier/company options.
   *
   * @returns Carrier options for frontend display.
   */
  async listCarriers(): Promise<DeliveryCarrierOptionDto[]> {
    return this.deliveryProvider.listCarriers();
  }

  /**
   * Gets and stores a delivery quote before checkout/payment initialization.
   *
   * @param userId - Authenticated buyer user ID.
   * @param input - Validated quote request.
   * @returns Stored quote snapshot.
   */
  async createQuote(
    userId: string,
    input: CreateDeliveryQuoteInput,
  ): Promise<DeliveryQuoteResponseDto> {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile) {
      throw new NotFoundException('Buyer profile not found');
    }

    const [address, product] = await Promise.all([
      this.prisma.buyerAddress.findFirst({
        where: { id: input.deliveryAddressId, buyerProfileId: buyerProfile.id },
      }),
      this.prisma.product.findUnique({
        where: { id: input.productId },
        include: { sellerProfile: true },
      }),
    ]);

    if (!address) {
      throw new NotFoundException('Delivery address not found');
    }

    if (!product || !this.isProductDeliveryEligible(product)) {
      throw new UnprocessableEntityException(
        'Product is not available for delivery quote',
      );
    }

    if (product.stockQuantity < input.quantity) {
      throw new UnprocessableEntityException(
        'Product does not have enough stock',
      );
    }

    const pickupAddress = this.buildPickupAddress(product.sellerProfile);
    const dropoffAddress = this.buildDropoffAddress(address);
    const providerQuote = await this.deliveryProvider.getQuote({
      pickupAddress,
      pickupState: product.sellerProfile.baseLocation ?? undefined,
      dropoffAddress,
      dropoffState: address.state,
      dropoffCity: address.city ?? undefined,
      packageDescription: product.title,
      quantity: input.quantity,
      weightKg: input.packageWeightKg,
      vehicle: input.vehicle ?? this.deliveryConfig.defaultVehicle,
    });
    const expiresAt = new Date(
      Date.now() + this.deliveryConfig.quoteTtlMinutes * 60 * 1000,
    );

    const quote = await this.prisma.deliveryQuote.create({
      data: {
        buyerProfileId: buyerProfile.id,
        productId: product.id,
        sellerProfileId: product.sellerProfileId,
        provider: this.deliveryConfig.provider,
        providerQuoteReference: providerQuote.providerQuoteReference,
        providerCompanyId: providerQuote.providerCompanyId,
        providerCompanyName: providerQuote.providerCompanyName,
        vehicle: providerQuote.vehicle ?? input.vehicle,
        pickupState: product.sellerProfile.baseLocation,
        pickupAddress,
        dropoffState: address.state,
        dropoffCity: address.city,
        dropoffAddress,
        quantity: input.quantity,
        packageWeightKg: input.packageWeightKg,
        quotedFeeKobo: providerQuote.amountKobo,
        estimatedPickupAt: providerQuote.estimatedPickupAt,
        estimatedDeliveryAt: providerQuote.estimatedDeliveryAt,
        expiresAt,
        metadata: providerQuote.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    this.logger.log(`Delivery quote created for buyer ${buyerProfile.id}`);

    return mapDeliveryQuote(quote);
  }

  /**
   * Books provider delivery for a seller-owned order item after escrow hold.
   *
   * @param userId - Authenticated seller user ID.
   * @param orderItemId - Order item to book.
   * @returns Stored delivery shipment.
   */
  async bookOrderItemDelivery(
    userId: string,
    orderItemId: string,
  ): Promise<DeliveryShipmentResponseDto> {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        sellerProfile: { include: { user: { select: { phoneNumber: true } } } },
        deliveryQuote: true,
        deliveryShipment: true,
        escrow: true,
        product: true,
        order: { include: { buyerProfile: { include: { user: true } } } },
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    if (orderItem.sellerProfile.userId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to book delivery for this order item',
      );
    }

    if (orderItem.deliveryShipment) {
      return mapDeliveryShipment(orderItem.deliveryShipment);
    }

    if (orderItem.status !== OrderItemStatus.AWAITING_DISPATCH) {
      throw new UnprocessableEntityException(
        'Delivery can only be booked for items awaiting dispatch',
      );
    }

    if (!orderItem.escrow || orderItem.escrow.status !== EscrowStatus.HELD) {
      throw new UnprocessableEntityException('Order item escrow is not held');
    }

    if (!orderItem.deliveryQuote) {
      throw new UnprocessableEntityException('Delivery quote not found');
    }

    const deliveryQuote = orderItem.deliveryQuote;
    const providerBooking = await this.deliveryProvider.bookDelivery({
      orderReference: orderItem.order.orderReference,
      orderItemId: orderItem.id,
      deliveryFeeKobo: deliveryQuote.quotedFeeKobo,
      providerCompanyId: deliveryQuote.providerCompanyId ?? undefined,
      pickupAddress:
        deliveryQuote.pickupAddress ??
        this.buildPickupAddress(orderItem.sellerProfile),
      pickupState: deliveryQuote.pickupState ?? undefined,
      pickupCity: deliveryQuote.pickupCity ?? undefined,
      dropoffAddress: deliveryQuote.dropoffAddress,
      dropoffState: deliveryQuote.dropoffState,
      dropoffCity: deliveryQuote.dropoffCity ?? undefined,
      packageDescription: orderItem.product.title,
      quantity: orderItem.quantity,
      weightKg: deliveryQuote.packageWeightKg ?? undefined,
      vehicle: deliveryQuote.vehicle ?? this.deliveryConfig.defaultVehicle,
      receiverName: orderItem.order.buyerProfile.fullName,
      receiverPhone:
        orderItem.order.buyerProfile.phoneNumber ??
        orderItem.order.buyerProfile.user.phoneNumber ??
        undefined,
      pickupContactName: orderItem.sellerProfile.businessName,
      pickupContactPhone: orderItem.sellerProfile.user.phoneNumber ?? undefined,
    });

    const shipment = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const safetyTimerExpiresAt = await this.calculateSafetyTimerExpiry(tx);
      const createdShipment = await tx.deliveryShipment.create({
        data: {
          orderItemId: orderItem.id,
          provider: this.deliveryConfig.provider,
          method: DeliveryMethod.THIRD_PARTY_PROVIDER,
          status: providerBooking.status,
          providerShipmentReference: providerBooking.providerShipmentReference,
          providerOrderId: providerBooking.providerOrderId,
          providerOrderCode: providerBooking.providerOrderCode,
          providerPackageId: providerBooking.providerPackageId,
          trackingReference: providerBooking.trackingReference,
          packageTrackingReference: providerBooking.packageTrackingReference,
          deliveryFeeKobo: deliveryQuote.quotedFeeKobo,
          pickupAddressSnapshot: {
            address: deliveryQuote.pickupAddress,
            state: deliveryQuote.pickupState,
            city: deliveryQuote.pickupCity,
          },
          dropoffAddressSnapshot: {
            address: deliveryQuote.dropoffAddress,
            state: deliveryQuote.dropoffState,
            city: deliveryQuote.dropoffCity,
          },
          readyForPickupAt: now,
          bookedAt: now,
          metadata: providerBooking.metadata as
            | Prisma.InputJsonValue
            | undefined,
        },
      });

      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: {
          status: OrderItemStatus.DISPATCHED,
          dispatchedAt: now,
          safetyTimerExpiresAt,
        },
      });

      await tx.order.updateMany({
        where: { id: orderItem.orderId, status: OrderStatus.PAID },
        data: { status: OrderStatus.PARTIALLY_FULFILLED },
      });

      return createdShipment;
    });

    this.logger.log(`Delivery booked for order item ${orderItem.id}`);

    return mapDeliveryShipment(shipment);
  }

  /**
   * Tracks and records a provider delivery event.
   *
   * @param shipmentId - Internal shipment ID.
   * @returns Normalized tracking result.
   */
  async trackShipment(
    shipmentId: string,
  ): Promise<DeliveryTrackingResponseDto> {
    const shipment = await this.prisma.deliveryShipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Delivery shipment not found');
    }

    const reference =
      shipment.trackingReference ??
      shipment.packageTrackingReference ??
      shipment.providerShipmentReference;

    if (!reference) {
      throw new UnprocessableEntityException(
        'Delivery shipment has no provider tracking reference',
      );
    }

    const tracking = await this.deliveryProvider.trackDelivery(reference);
    await this.recordTrackingEvent(shipment.id, tracking);

    return mapDeliveryTracking(tracking);
  }

  /**
   * Records a provider webhook event without releasing escrow.
   *
   * @param payload - Parsed provider webhook payload.
   * @returns Normalized tracking response.
   */
  async handleWebhook(
    payload: Record<string, unknown>,
    signature: string,
    rawBody?: Buffer | string,
  ): Promise<DeliveryTrackingResponseDto> {
    if (
      !this.deliveryProvider.verifyWebhookSignature(payload, signature, rawBody)
    ) {
      throw new UnauthorizedException('Invalid delivery webhook signature');
    }

    const tracking = this.deliveryProvider.mapWebhook(payload);
    const reference = this.extractWebhookReference(payload);

    if (reference) {
      const shipment = await this.prisma.deliveryShipment.findFirst({
        where: {
          OR: [
            { trackingReference: reference },
            { packageTrackingReference: reference },
            { providerShipmentReference: reference },
          ],
        },
      });

      if (shipment) {
        await this.recordTrackingEvent(shipment.id, tracking);
      }
    }

    return mapDeliveryTracking(tracking);
  }

  private get deliveryConfig(): DeliveryConfig {
    return this.configService.getOrThrow<DeliveryConfig>('delivery');
  }

  private isProductDeliveryEligible(product: {
    status: ProductStatus;
    isActive: boolean;
    deletedAt: Date | null;
    sellerProfile: { kycStatus: KycStatus; status: StoreStatus };
  }): boolean {
    return (
      product.status === ProductStatus.LIVE &&
      product.isActive &&
      product.deletedAt === null &&
      product.sellerProfile.kycStatus === KycStatus.VERIFIED &&
      product.sellerProfile.status === StoreStatus.ACTIVE
    );
  }

  private buildPickupAddress(sellerProfile: {
    businessName: string;
    baseLocation: string | null;
  }): string {
    return [sellerProfile.businessName, sellerProfile.baseLocation ?? 'Lagos']
      .filter(Boolean)
      .join(', ');
  }

  private buildDropoffAddress(address: {
    streetAddress: string;
    city: string | null;
    state: string;
  }): string {
    return [address.streetAddress, address.city, address.state]
      .filter(Boolean)
      .join(', ');
  }

  private async recordTrackingEvent(
    shipmentId: string,
    tracking: {
      status?: DeliveryStatus;
      providerStatus?: string;
      providerEventId?: string;
      occurredAt?: Date;
      location?: string;
      description?: string;
      payload?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (tracking.providerEventId) {
      await this.prisma.deliveryEvent.upsert({
        where: {
          provider_providerEventId: {
            provider: this.deliveryConfig.provider,
            providerEventId: tracking.providerEventId,
          },
        },
        update: {},
        create: {
          deliveryShipmentId: shipmentId,
          provider: this.deliveryConfig.provider,
          providerEventId: tracking.providerEventId,
          providerStatus: tracking.providerStatus,
          internalStatus: tracking.status,
          occurredAt: tracking.occurredAt,
          location: tracking.location,
          description: tracking.description,
          payload: tracking.payload as Prisma.InputJsonValue | undefined,
        },
      });
    } else {
      await this.prisma.deliveryEvent.create({
        data: {
          deliveryShipmentId: shipmentId,
          provider: this.deliveryConfig.provider,
          providerStatus: tracking.providerStatus,
          internalStatus: tracking.status,
          occurredAt: tracking.occurredAt,
          location: tracking.location,
          description: tracking.description,
          payload: tracking.payload as Prisma.InputJsonValue | undefined,
        },
      });
    }

    if (tracking.status) {
      await this.prisma.deliveryShipment.update({
        where: { id: shipmentId },
        data: {
          status: tracking.status,
          ...(tracking.status === DeliveryStatus.PICKED_UP
            ? { pickedUpAt: tracking.occurredAt ?? new Date() }
            : {}),
          ...(tracking.status === DeliveryStatus.ARRIVED_AT_DESTINATION
            ? { arrivedAtDestinationAt: tracking.occurredAt ?? new Date() }
            : {}),
          ...(tracking.status === DeliveryStatus.FAILED
            ? { failedAt: tracking.occurredAt ?? new Date() }
            : {}),
        },
      });
    }
  }

  private extractWebhookReference(
    payload: Record<string, unknown>,
  ): string | undefined {
    for (const key of [
      'trackingReference',
      'tracking_reference',
      'TrackingCode',
      'TrackingID',
      'order_id',
      'OrderID',
      'OrderCode',
      'Reference',
    ]) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) return value;
      if (typeof value === 'number') return String(value);
    }
    const order = payload.order;
    if (order && typeof order === 'object') {
      return this.extractWebhookReference(order as Record<string, unknown>);
    }
    return undefined;
  }

  private async calculateSafetyTimerExpiry(tx: {
    platformSetting: {
      findUnique: (args: {
        where: { settingKey: string };
      }) => Promise<{ settingValue: string } | null>;
    };
  }): Promise<Date> {
    const setting = await tx.platformSetting.findUnique({
      where: { settingKey: SAFETY_TIMER_SETTING_KEY },
    });
    const safetyTimerDays = this.parseSafetyTimerDays(
      setting?.settingValue,
      DEFAULT_SAFETY_TIMER_DAYS,
    );

    return new Date(Date.now() + safetyTimerDays * MILLISECONDS_PER_DAY);
  }

  private parseSafetyTimerDays(
    settingValue: string | undefined,
    fallbackDays: number,
  ): number {
    if (!settingValue) {
      return fallbackDays;
    }

    const parsedValue = Number(settingValue);

    if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 60) {
      throw new UnprocessableEntityException(
        'Invalid order item safety timer platform setting',
      );
    }

    return parsedValue;
  }
}
