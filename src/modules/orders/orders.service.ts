import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AccountStatus,
  DisputeStatus,
  EscrowStatus,
  KycStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  StoreStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { EscrowReleaseResponseDto } from '../escrow/dto/escrow-release-response.dto';
import { DispatchOrderItemInput } from './dto/dispatch-order-item.dto';
import { DispatchOrderItemResponseDto } from './dto/dispatch-response.dto';
import { InitializeOrderInput } from './dto/initialize-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { mapOrder } from './order.mapper';

const SERVICE_FEE_BASIS_POINTS = 500;
const BASIS_POINTS_DIVISOR = BigInt(10_000);
const SAFETY_TIMER_SETTING_KEY = 'order_item_safety_timer_days';
const DEFAULT_SAFETY_TIMER_DAYS = 5;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const activeDisputeStatuses = [
  DisputeStatus.OPEN,
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.AWAITING_BUYER_RETURN,
  DisputeStatus.RETURN_IN_TRANSIT,
];

const orderInclude = {
  items: {
    include: {
      product: true,
      sellerProfile: true,
    },
  },
} as const;

interface ProductForCheckout {
  id: string;
  sellerProfileId: string;
  title: string;
  slug: string;
  priceKobo: bigint;
  stockQuantity: number;
  status: ProductStatus;
  isActive: boolean;
  deletedAt: Date | null;
  sellerProfile: {
    id: string;
    businessName: string;
    storeHandle: string;
    kycStatus: KycStatus;
    status: StoreStatus;
  };
}

interface CheckoutLine {
  product: ProductForCheckout;
  quantity: number;
  productAmountKobo: bigint;
  shippingFeeKobo: bigint;
  serviceFeeKobo: bigint;
  netEscrowAmountKobo: bigint;
}

interface DispatchEvidenceLike {
  id: string;
  evidenceType: string | null;
  imageUrl: string | null;
  storageKey: string | null;
  trackingReference: string | null;
  courierName: string | null;
  notes: string | null;
  uploadedAt: Date;
}

/**
 * Handles order initialization from client-side checkout payloads.
 *
 * The service does not read or persist cart items. It validates submitted
 * product IDs against current product/store state, snapshots prices into order
 * items, and leaves payment and escrow funding for later explicit flows.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
  ) {}

  /**
   * Creates a parent order and pending-payment order items from client data.
   *
   * @param userId - Authenticated buyer user ID.
   * @param input - Validated client-side checkout items.
   * @returns Created pending-payment order.
   * @throws NotFoundException when the buyer profile does not exist.
   * @throws UnprocessableEntityException when products are unavailable.
   */
  async initializeOrder(
    userId: string,
    input: InitializeOrderInput,
  ): Promise<OrderResponseDto> {
    const buyerProfile = await this.prisma.buyerProfile.findUnique({
      where: { userId },
    });

    if (!buyerProfile || buyerProfile.status !== AccountStatus.ACTIVE) {
      throw new NotFoundException('Buyer profile not found');
    }

    const requestedItems = this.aggregateItems(input.items);
    const products = await this.prisma.product.findMany({
      where: { id: { in: requestedItems.map((item) => item.productId) } },
      include: { sellerProfile: true },
    });

    const checkoutLines = this.buildCheckoutLines(requestedItems, products);
    const totals = this.calculateTotals(checkoutLines);

    const order = await this.prisma.$transaction((tx) =>
      tx.order.create({
        data: {
          buyerProfileId: buyerProfile.id,
          orderReference: this.generateOrderReference(),
          status: OrderStatus.PENDING_PAYMENT,
          totalProductAmountKobo: totals.totalProductAmountKobo,
          totalShippingFeeKobo: totals.totalShippingFeeKobo,
          totalServiceFeeKobo: totals.totalServiceFeeKobo,
          totalOrderAmountKobo: totals.totalOrderAmountKobo,
          items: {
            create: checkoutLines.map((line) => ({
              productId: line.product.id,
              sellerProfileId: line.product.sellerProfileId,
              quantity: line.quantity,
              unitPriceAtCheckoutKobo: line.product.priceKobo,
              productAmountKobo: line.productAmountKobo,
              shippingFeeKobo: line.shippingFeeKobo,
              serviceFeeKobo: line.serviceFeeKobo,
              netEscrowAmountKobo: line.netEscrowAmountKobo,
              status: OrderItemStatus.PENDING_PAYMENT,
            })),
          },
        },
        include: orderInclude,
      }),
    );

    this.logger.log(
      `Order initialized for buyer profile ${buyerProfile.id}: ${order.id}`,
    );

    return mapOrder(order, SERVICE_FEE_BASIS_POINTS);
  }

  /**
   * Stores seller dispatch evidence and starts the item safety timer.
   *
   * @param userId - Authenticated seller user ID.
   * @param orderId - Parent order ID.
   * @param itemId - Order item being dispatched.
   * @param input - Validated dispatch evidence metadata.
   * @returns Dispatch status and saved evidence metadata.
   * @throws NotFoundException when the order item is missing.
   * @throws ForbiddenException when the seller does not own the order item.
   * @throws UnprocessableEntityException when payment, item, or escrow state is invalid.
   */
  async dispatchOrderItem(
    userId: string,
    orderId: string,
    itemId: string,
    input: DispatchOrderItemInput,
  ): Promise<DispatchOrderItemResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.findFirst({
        where: { id: itemId, orderId },
        include: {
          sellerProfile: true,
          escrow: true,
          order: {
            include: {
              payments: {
                where: { status: PaymentStatus.SUCCESS },
                take: 1,
              },
            },
          },
        },
      });

      if (!orderItem) {
        throw new NotFoundException('Order item not found');
      }

      if (orderItem.sellerProfile.userId !== userId) {
        throw new ForbiddenException(
          'You are not allowed to dispatch this order item',
        );
      }

      if (orderItem.status !== OrderItemStatus.AWAITING_DISPATCH) {
        throw new UnprocessableEntityException(
          'Order item is not awaiting dispatch',
        );
      }

      if (!orderItem.order.payments.length) {
        throw new UnprocessableEntityException(
          'Order payment has not been verified',
        );
      }

      if (!orderItem.escrow || orderItem.escrow.status !== EscrowStatus.HELD) {
        throw new UnprocessableEntityException('Order item escrow is not held');
      }

      const safetyTimerExpiresAt = await this.calculateSafetyTimerExpiry(tx);
      const dispatchedAt = new Date();

      const evidence = await tx.dispatchEvidence.create({
        data: {
          orderItemId: itemId,
          sellerProfileId: orderItem.sellerProfileId,
          evidenceType: input.evidenceType,
          imageUrl: input.imageUrl,
          storageKey: input.storageKey,
          trackingReference: input.trackingReference,
          courierName: input.courierName,
          notes: input.notes,
        },
      });

      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: {
          status: OrderItemStatus.DISPATCHED,
          dispatchedAt,
          safetyTimerExpiresAt,
        },
      });

      await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PAID },
        data: { status: OrderStatus.PARTIALLY_FULFILLED },
      });

      return { orderItem: updatedItem, evidence };
    });

    this.logger.log(
      `Order item dispatched by seller ${userId}: ${result.orderItem.id}`,
    );

    return this.mapDispatchOrderItemResponse(
      result.orderItem.orderId,
      result.orderItem.id,
      result.orderItem.status,
      result.orderItem.dispatchedAt,
      result.orderItem.safetyTimerExpiresAt,
      result.evidence,
    );
  }

  /**
   * Confirms buyer acceptance for an owned order item and releases escrow.
   *
   * @param userId - Authenticated buyer user ID.
   * @param orderId - Parent order ID.
   * @param itemId - Order item being confirmed.
   * @returns Escrow release result after seller funds are released.
   * @throws NotFoundException when the order item is missing.
   * @throws ForbiddenException when the buyer does not own the parent order.
   * @throws UnprocessableEntityException when item or escrow state disallows confirmation.
   */
  async confirmOrderItemDelivery(
    userId: string,
    orderId: string,
    itemId: string,
  ): Promise<EscrowReleaseResponseDto> {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
      include: {
        escrow: true,
        order: { include: { buyerProfile: true } },
        disputes: {
          where: { status: { in: activeDisputeStatuses } },
          take: 1,
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    if (orderItem.order.buyerProfile.userId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to confirm this order item',
      );
    }

    if (
      orderItem.status === OrderItemStatus.DISPUTED ||
      orderItem.status === OrderItemStatus.RELEASED ||
      orderItem.status === OrderItemStatus.REFUNDED ||
      orderItem.status === OrderItemStatus.CANCELLED
    ) {
      throw new UnprocessableEntityException(
        'Order item cannot be confirmed from its current state',
      );
    }

    if (
      orderItem.status !== OrderItemStatus.DISPATCHED &&
      orderItem.status !== OrderItemStatus.DELIVERED
    ) {
      throw new UnprocessableEntityException(
        'Only dispatched or delivered order items can be confirmed',
      );
    }

    if (!orderItem.escrow || orderItem.escrow.status !== EscrowStatus.HELD) {
      throw new UnprocessableEntityException('Order item escrow is not held');
    }

    if (orderItem.escrow.releasedAt || orderItem.escrow.refundedAt) {
      throw new UnprocessableEntityException(
        'Order item escrow is already closed',
      );
    }

    if (orderItem.disputes.length > 0) {
      throw new UnprocessableEntityException(
        'Disputed order items cannot be confirmed',
      );
    }

    const release = await this.escrowService.releaseEscrowToSeller({
      orderItemId: itemId,
      reason: 'BUYER_CONFIRMATION',
      requireBuyerConfirmationState: true,
    });

    this.logger.log(`Buyer ${userId} confirmed order item ${itemId}`);

    return release;
  }

  private aggregateItems(
    items: InitializeOrderInput['items'],
  ): { productId: string; quantity: number }[] {
    const quantitiesByProduct = new Map<string, number>();

    for (const item of items) {
      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }

    return [...quantitiesByProduct.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  }

  private buildCheckoutLines(
    requestedItems: { productId: string; quantity: number }[],
    products: ProductForCheckout[],
  ): CheckoutLine[] {
    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );

    return requestedItems.map((item) => {
      const product = productsById.get(item.productId);

      if (!product || !this.isProductCheckoutEligible(product)) {
        throw new UnprocessableEntityException(
          'One or more products are unavailable for checkout',
        );
      }

      if (product.stockQuantity < item.quantity) {
        throw new UnprocessableEntityException(
          'One or more products do not have enough stock',
        );
      }

      const productAmountKobo = product.priceKobo * BigInt(item.quantity);
      const shippingFeeKobo = BigInt(0);
      const serviceFeeKobo = this.calculateServiceFee(productAmountKobo);

      return {
        product,
        quantity: item.quantity,
        productAmountKobo,
        shippingFeeKobo,
        serviceFeeKobo,
        netEscrowAmountKobo: productAmountKobo,
      };
    });
  }

  private isProductCheckoutEligible(product: ProductForCheckout): boolean {
    return (
      product.status === ProductStatus.LIVE &&
      product.isActive &&
      product.deletedAt === null &&
      product.sellerProfile.kycStatus === KycStatus.VERIFIED &&
      product.sellerProfile.status === StoreStatus.ACTIVE
    );
  }

  private calculateServiceFee(productAmountKobo: bigint): bigint {
    return (
      (productAmountKobo * BigInt(SERVICE_FEE_BASIS_POINTS)) /
      BASIS_POINTS_DIVISOR
    );
  }

  private calculateTotals(checkoutLines: CheckoutLine[]): {
    totalProductAmountKobo: bigint;
    totalShippingFeeKobo: bigint;
    totalServiceFeeKobo: bigint;
    totalOrderAmountKobo: bigint;
  } {
    const totals = checkoutLines.reduce(
      (sum, line) => ({
        totalProductAmountKobo:
          sum.totalProductAmountKobo + line.productAmountKobo,
        totalShippingFeeKobo: sum.totalShippingFeeKobo + line.shippingFeeKobo,
        totalServiceFeeKobo: sum.totalServiceFeeKobo + line.serviceFeeKobo,
      }),
      {
        totalProductAmountKobo: BigInt(0),
        totalShippingFeeKobo: BigInt(0),
        totalServiceFeeKobo: BigInt(0),
      },
    );

    return {
      ...totals,
      totalOrderAmountKobo:
        totals.totalProductAmountKobo +
        totals.totalShippingFeeKobo +
        totals.totalServiceFeeKobo,
    };
  }

  private generateOrderReference(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();

    return `ORD-${date}-${random}`;
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

  private mapDispatchOrderItemResponse(
    orderId: string,
    orderItemId: string,
    status: OrderItemStatus,
    dispatchedAt: Date | null,
    safetyTimerExpiresAt: Date | null,
    evidence: DispatchEvidenceLike,
  ): DispatchOrderItemResponseDto {
    if (!dispatchedAt || !safetyTimerExpiresAt) {
      throw new UnprocessableEntityException(
        'Dispatch timestamp could not be saved',
      );
    }

    return {
      orderId,
      orderItemId,
      status,
      dispatchedAt,
      safetyTimerExpiresAt,
      evidence: {
        id: evidence.id,
        evidenceType: evidence.evidenceType,
        imageUrl: evidence.imageUrl,
        storageKey: evidence.storageKey,
        trackingReference: evidence.trackingReference,
        courierName: evidence.courierName,
        notes: evidence.notes,
        uploadedAt: evidence.uploadedAt,
      },
    };
  }
}
