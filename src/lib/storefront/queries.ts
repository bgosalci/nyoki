import { CATEGORY_ORDER } from "@/lib/categories/ordering";
import { onShop } from "@/lib/categories/visibility";
import { db } from "@/lib/db";
import { ALSO_LIKE_LIMIT } from "@/lib/products/also-like";
import { toCardProduct, type CardProduct, type CardSource } from "@/lib/storefront/card";
import { stockedDepartments } from "@/lib/storefront/departments";
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

/** Products on sale to the public: active only, in the order set by dragging them in the admin. */
export async function activeProducts(where = {}, take?: number) {
  return db.product.findMany({
    where: { status: "ACTIVE", ...where },
    orderBy: { sortKey: "desc" },
    take,
    select: CARD_SELECT,
  });
}

/**
 * The departments and the types in each, in the order set by dragging them
 * on the admin's categories page: the header's menu and the footer read
 * this. Only those on the shop (`onShop`) with a piece on the shop in them,
 * or anywhere beneath them, are listed (`stockedDepartments`); a piece
 * filed only in an inactive type fills nothing above it. `take` caps the
 * types per department, first first.
 */
export async function departments(take?: number) {
  const [categories, links] = await Promise.all([
    db.category.findMany({
      orderBy: CATEGORY_ORDER,
      select: { id: true, slug: true, name: true, labelColour: true, parentId: true, active: true },
    }),
    // Which categories a piece on the shop is filed in directly; the tree
    // above them is filled in from `categories`, however deep it goes.
    db.categoryProduct.findMany({
      where: { product: { status: "ACTIVE" } },
      distinct: ["categoryId"],
      select: { categoryId: true },
    }),
  ]);

  return stockedDepartments(onShop(categories), links.map((link) => link.categoryId), take);
}

/**
 * Every category on the shop in that same order, so the tiles a page builds
 * from them follow it. An inactive one, and everything inside it, is not
 * among them: it has no page, no tile, and no part in a page above it.
 */
export async function shopCategories() {
  const categories = await db.category.findMany({
    orderBy: CATEGORY_ORDER,
    select: { id: true, slug: true, name: true, parentId: true, description: true, active: true },
  });
  return onShop(categories);
}

/**
 * What "You may also like" picks by itself for a product: pieces on the shop
 * from the same categories, in the shop's order - so a piece dragged to the
 * top of its category is suggested first too. Shared by the product's page
 * and the admin field that shows it, so what Njomza is shown is what the
 * shop shows. Twice what the row holds, so the pieces she has chosen
 * herself still leave enough to fill it.
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
    // In the shop's own order, so a tile's photo is its first piece.
    orderBy: { sortKey: "desc" },
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
