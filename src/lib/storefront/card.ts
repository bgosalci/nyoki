import { formatPence } from "@/lib/money";
import { effectivePricePence, type PricingSale } from "@/lib/pricing";

export interface CardImage {
  url: string;
  alt: string | null;
}

export type BadgeTone = "sale" | "made" | "one";

export interface CardBadge {
  label: string;
  /** Decides the badge's colours; see the theme board's component samples. */
  tone: BadgeTone;
}

export interface CardProduct {
  href: string;
  name: string;
  /** What the shopper pays. */
  pricePence: number;
  /** Struck through beside it, or null when there is nothing to compare. */
  wasPence: number | null;
  badges: CardBadge[];
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

function saleBadge(sale: PricingSale): CardBadge {
  return {
    label: sale.type === "PERCENTAGE" ? `${sale.value}% off` : `${formatPence(sale.value)} off`,
    tone: "sale",
  };
}

/**
 * A product row turned into what a card shows.
 *
 * A live sale beats the was-price: the sale is what will actually be charged,
 * so it is the saving worth showing.
 */
export function toCardProduct(product: CardSource, now: Date): CardProduct {
  const { pricePence, sale } = effectivePricePence(product.pricePence, product.sales, now);

  // Ordered as the theme board has them: the saving first, then how it is made.
  const badges: CardBadge[] = [];
  if (sale) badges.push(saleBadge(sale));
  if (product.madeToOrder) {
    badges.push({
      label: product.leadTimeDays ? `Made to order · ${product.leadTimeDays} days` : "Made to order",
      tone: "made",
    });
  }
  if (product.oneOfAKind) badges.push({ label: "One of a kind", tone: "one" });

  return {
    href: `/product/${product.slug}`,
    name: product.name,
    pricePence,
    wasPence: sale ? product.pricePence : product.compareAtPence,
    badges,
    image: product.images[0] ?? null,
  };
}
