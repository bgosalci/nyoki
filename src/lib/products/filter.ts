import type { ProductStatus } from "@/lib/products/validate";

const STATUSES: readonly ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

export interface ProductFilter {
  q: string | null;
  status: ProductStatus | null;
  /** A category slug; resolved to ids by the page, since the tree lives in the database. */
  category: string | null;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** The list filter from the page's query string. Anything unusable is simply ignored. */
export function parseProductFilter(params: SearchParams): ProductFilter {
  const q = first(params.q).trim();
  const status = first(params.status);
  const category = first(params.category).trim();

  return {
    q: q.length > 0 ? q : null,
    status: STATUSES.includes(status as ProductStatus) ? (status as ProductStatus) : null,
    category: category.length > 0 ? category : null,
  };
}

/**
 * The Prisma `where` for a filter. Search covers the name and the product
 * code. `categoryIds` is the selected category and its descendants, already
 * resolved; an empty list means the slug matched nothing and is ignored, so a
 * stale link never hides the whole catalogue.
 */
export function productWhere(filter: ProductFilter, categoryIds: readonly string[] = []) {
  return {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.category && categoryIds.length > 0
      ? { categories: { some: { categoryId: { in: [...categoryIds] } } } }
      : {}),
    ...(filter.q
      ? {
          OR: [
            { name: { contains: filter.q, mode: "insensitive" as const } },
            { sku: { contains: filter.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}
