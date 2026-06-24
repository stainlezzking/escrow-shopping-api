import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AccountStatus,
  KycStatus,
  OrderItemStatus,
  OrderStatus,
  ProductStatus,
  StoreStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { InitializeOrderInput } from './dto/initialize-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { mapOrder } from './order.mapper';

const SERVICE_FEE_BASIS_POINTS = 500;
const BASIS_POINTS_DIVISOR = BigInt(10_000);

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

  constructor(private readonly prisma: PrismaService) {}

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
}
