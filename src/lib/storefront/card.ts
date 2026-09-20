import { formatPence } from "@/lib/money";
import { effectivePricePence, type PricingSale } from "@/lib/pricing";

export interface CardImage {
  url: string;
  alt: string | null;
}

export interface CardProduct {
  href: string;
  name: string;
  /** What the shopper pays. */
  pricePence: number;
  /** Struck through beside it, or null when there is nothing to compare. */
  wasPence: number | null;
  badges: string[];
  image: CardImage | null;
}

export interface CardSource {
  slug: string;
  name: string;
  pricePence: number;
  compareAtPence: number | null;
  oneOfAKind: boolean;
  madeToOrder: boolean;
  leadTimeDays: number | null;
  images: CardImage[];
  sales: PricingSale[];
}

function saleBadge(sale: PricingSale): string {
  return sale.type === "PERCENTAGE" ? `${sale.value}% off` : `${formatPence(sale.value)} off`;
}

/**
 * A product row turned into what a card shows.
 *
 * A live sale beats the was-price: the sale is what will actually be charged,
 * so it is the saving worth showing.
 */
export function toCardProduct(product: CardSource, now: Date): CardProduct {
  const { pricePence, sale } = effectivePricePence(product.pricePence, product.sales, now);

  const badges: string[] = [];
  if (sale) badges.push(saleBadge(sale));
  if (product.oneOfAKind) badges.push("One of a kind");
  if (product.madeToOrder) {
    badges.push(product.leadTimeDays ? `Made to order · ${product.leadTimeDays} days` : "Made to order");
  }

  return {
    href: `/product/${product.slug}`,
    name: product.name,
    pricePence,
    wasPence: sale ? product.pricePence : product.compareAtPence,
    badges,
    image: product.images[0] ?? null,
  };
}
