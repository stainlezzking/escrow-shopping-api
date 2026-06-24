import { OrderItemStatus, OrderStatus } from '@prisma/client';
import { OrderResponseDto } from './dto/order-response.dto';

interface OrderLike {
  id: string;
  orderReference: string;
  status: OrderStatus;
  totalProductAmountKobo: bigint;
  totalShippingFeeKobo: bigint;
  totalServiceFeeKobo: bigint;
  totalOrderAmountKobo: bigint;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  completedAt: Date | null;
  items: OrderItemLike[];
}

interface OrderItemLike {
  id: string;
  quantity: number;
  unitPriceAtCheckoutKobo: bigint;
  productAmountKobo: bigint;
  shippingFeeKobo: bigint;
  serviceFeeKobo: bigint;
  netEscrowAmountKobo: bigint;
  status: OrderItemStatus;
  product: {
    id: string;
    title: string;
    slug: string;
  };
  sellerProfile?: {
    id: string;
    businessName: string;
    storeHandle: string;
  } | null;
}

/**
 * Maps an order record into a BigInt-safe API response.
 *
 * @param order - Order with item, product, and seller snapshots.
 * @param serviceFeeBasisPoints - Fee rate used during checkout calculation.
 * @returns Public-safe order response.
 */
export function mapOrder(
  order: OrderLike,
  serviceFeeBasisPoints: number,
): OrderResponseDto {
  return {
    id: order.id,
    orderReference: order.orderReference,
    status: order.status,
    totalProductAmountKobo: order.totalProductAmountKobo.toString(),
    totalShippingFeeKobo: order.totalShippingFeeKobo.toString(),
    totalServiceFeeKobo: order.totalServiceFeeKobo.toString(),
    totalOrderAmountKobo: order.totalOrderAmountKobo.toString(),
    serviceFeeBasisPoints,
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPriceAtCheckoutKobo: item.unitPriceAtCheckoutKobo.toString(),
      productAmountKobo: item.productAmountKobo.toString(),
      shippingFeeKobo: item.shippingFeeKobo.toString(),
      serviceFeeKobo: item.serviceFeeKobo.toString(),
      netEscrowAmountKobo: item.netEscrowAmountKobo.toString(),
      status: item.status,
      product: {
        id: item.product.id,
        title: item.product.title,
        slug: item.product.slug,
      },
      seller: {
        id: item.sellerProfile?.id ?? '',
        businessName: item.sellerProfile?.businessName ?? '',
        storeHandle: item.sellerProfile?.storeHandle ?? '',
      },
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    cancelledAt: order.cancelledAt,
    completedAt: order.completedAt,
  };
}
