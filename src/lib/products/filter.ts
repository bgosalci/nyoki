import type { ProductStatus } from "@/lib/products/validate";

const STATUSES: readonly ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

export interface ProductFilter {
  q: string | null;
  status: ProductStatus | null;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** The list filter from the page's query string. Anything unusable is simply ignored. */
export function parseProductFilter(params: SearchParams): ProductFilter {
  const q = first(params.q).trim();
  const status = first(params.status);

  return {
    q: q.length > 0 ? q : null,
    status: STATUSES.includes(status as ProductStatus) ? (status as ProductStatus) : null,
  };
}

/** The Prisma `where` for a filter. Search covers the name and the product code. */
export function productWhere(filter: ProductFilter) {
  return {
    ...(filter.status ? { status: filter.status } : {}),
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
