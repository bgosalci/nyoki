import { db } from "@/lib/db";
import { toCardProduct, type CardProduct, type CardSource } from "@/lib/storefront/card";

/** Everything a card needs, in one shape, for every storefront query. */
export const CARD_SELECT = {
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
