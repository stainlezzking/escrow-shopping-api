import {
  BusinessCategoryResponseDto,
  ProductCategoryResponseDto,
  ProductCategoryTreeNodeDto,
} from './dto/category-response.dto';

interface BusinessCategoryLike {
  id: string;
  name: string;
  description?: string | null;
  status: BusinessCategoryResponseDto['status'];
  createdAt: Date;
  updatedAt: Date;
}

interface ProductCategoryLike {
  id: string;
  name: string;
  slug: string;
  parentCategoryId?: string | null;
  level: number;
  description?: string | null;
  status: ProductCategoryResponseDto['status'];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maps a business category record to the public API response shape.
 *
 * @param category - Business category record.
 * @returns Business category response.
 */
export function mapBusinessCategory(
  category: BusinessCategoryLike,
): BusinessCategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/**
 * Maps a product category record to the API response shape.
 *
 * @param category - Product category record.
 * @returns Product category response.
 */
export function mapProductCategory(
  category: ProductCategoryLike,
): ProductCategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentCategoryId: category.parentCategoryId ?? null,
    level: category.level,
    description: category.description ?? null,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/**
 * Builds a recursive product category tree from a flat list.
 *
 * Orphaned categories are promoted to roots so malformed historical data does
 * not disappear from admin-visible or public reads.
 *
 * @param categories - Flat category list ordered by level/name.
 * @returns Recursive category tree.
 */
export function buildProductCategoryTree(
  categories: ProductCategoryLike[],
): ProductCategoryTreeNodeDto[] {
  const nodes = new Map<string, ProductCategoryTreeNodeDto>();

  for (const category of categories) {
    nodes.set(category.id, {
      ...mapProductCategory(category),
      children: [],
    });
  }

  const roots: ProductCategoryTreeNodeDto[] = [];

  for (const category of categories) {
    const node = nodes.get(category.id);

    if (!node) {
      continue;
    }

    const parent = category.parentCategoryId
      ? nodes.get(category.parentCategoryId)
      : null;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Creates a URL-safe category slug from a display name.
 *
 * @param value - Raw category name.
 * @returns Lowercase slug using single hyphen separators.
 */
export function slugifyCategoryName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
