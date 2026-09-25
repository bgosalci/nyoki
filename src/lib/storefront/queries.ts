import { db } from "@/lib/db";
import { ALSO_LIKE_LIMIT } from "@/lib/products/also-like";
import { toCardProduct, type CardProduct, type CardSource } from "@/lib/storefront/card";
import type { TileProduct } from "@/lib/storefront/tiles";

/** Everything a card needs, in one shape, for every storefront query. */
export const CARD_SELECT = {
  id: true,
  // Carried so a saved piece that has since come off the shop can be dropped
  // rather than linking to a page that is no longer there.
  status: true,
  slug: true,
  name: true,
  pricePence: true,
  compareAtPence: true,
  oneOfAKind: true,
  madeToOrder: true,
  leadTimeDays: true,
  images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
  sales: { select: { sale: true } },
} as const;

type CardRow = Omit<CardSource, "sales"> & { sales: { sale: CardSource["sales"][number] }[] };

/** Flattens the join rows and turns each product into what a card shows. */
export function toCards(rows: CardRow[], now = new Date()): CardProduct[] {
  return rows.map((row) => toCardProduct({ ...row, sales: row.sales.map((link) => link.sale) }, now));
}

/** Products on sale to the public: active only, newest first. */
export async function activeProducts(where = {}, take?: number) {
  return db.product.findMany({
    where: { status: "ACTIVE", ...where },
    orderBy: { createdAt: "desc" },
    take,
    select: CARD_SELECT,
  });
}

/**
 * What "You may also like" picks by itself for a product: pieces on the shop
 * from the same categories, newest first. Shared by the product's page and
 * the admin field that shows it, so what Njomza is shown is what the shop
 * shows. Twice what the row holds, so the pieces she has chosen herself
 * still leave enough to fill it.
 */
export async function automaticAlsoLike(productId: string, categoryIds: string[]) {
  if (categoryIds.length === 0) return [];
  return activeProducts({ id: { not: productId }, categories: { some: { categoryId: { in: categoryIds } } } }, ALSO_LIKE_LIMIT * 2);
}

/**
 * Every active product as a tile ingredient: which categories it sits in, and
 * one photo. One query for a whole page of tiles, rather than one per tile.
 */
export async function tileProducts(): Promise<TileProduct[]> {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      categories: { select: { categoryId: true } },
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
    },
  });

  return rows.map((row) => ({
    categoryIds: row.categories.map((link) => link.categoryId),
    image: row.images[0] ?? null,
  }));
}

/**
 * Which products this shopper has saved, as a set to look up against.
 *
 * One query for a page of cards, and an empty set for a visitor who is not
 * signed in - the hearts then render as an invitation to sign in rather than
 * as controls that cannot work.
 */
export async function savedProductIds(customerId: string | null): Promise<Set<string>> {
  if (!customerId) return new Set();

  const rows = await db.favourite.findMany({
    where: { customerId },
    select: { productId: true },
  });

  return new Set(rows.map((row) => row.productId));
}
