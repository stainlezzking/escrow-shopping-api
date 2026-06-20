import {
  ProductImageResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';

interface ProductLike {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  priceKobo: bigint;
  stockQuantity: number;
  status: ProductResponseDto['status'];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  sellerProfile?: {
    id: string;
    businessName: string;
    storeHandle: string;
  } | null;
  images?: ProductImageLike[];
}

interface ProductImageLike {
  id: string;
  imageUrl: string;
  storageKey?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

/**
 * Maps a product record into a BigInt-safe API response.
 *
 * @param product - Product record with seller and image relations.
 * @returns Public-safe product response.
 */
export function mapProduct(product: ProductLike): ProductResponseDto {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description ?? null,
    priceKobo: product.priceKobo.toString(),
    stockQuantity: product.stockQuantity,
    status: product.status,
    isActive: product.isActive,
    seller: {
      id: product.sellerProfile?.id ?? '',
      businessName: product.sellerProfile?.businessName ?? '',
      storeHandle: product.sellerProfile?.storeHandle ?? '',
    },
    images: (product.images ?? []).map((image) => mapProductImage(image)),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/**
 * Maps product image metadata to the API response shape.
 *
 * @param image - Product image metadata record.
 * @returns Product image response.
 */
export function mapProductImage(
  image: ProductImageLike,
): ProductImageResponseDto {
  return {
    id: image.id,
    imageUrl: image.imageUrl,
    storageKey: image.storageKey ?? null,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  };
}

/**
 * Creates a URL-safe product slug.
 *
 * @param value - Raw product title.
 * @returns Lowercase slug using hyphen separators.
 */
export function slugifyProductTitle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
