import { offeredAxes } from "@/lib/clothes/group";
import { inStock, toClothingOffer, type StockRow } from "@/lib/clothes/stock";
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
  id: string;
  href: string;
  name: string;
  /** What the shopper pays. */
  pricePence: number;
  /** Struck through beside it, or null when there is nothing to compare. */
  wasPence: number | null;
  badges: CardBadge[];
  image: CardImage | null;
  /** How many colours it can be bought in now, or null with no choice of colour to make. */
  colours: number | null;
}

export interface CardSource {
  id: string;
  slug: string;
  name: string;
  pricePence: number;
  compareAtPence: number | null;
  oneOfAKind: boolean;
  madeToOrder: boolean;
  madeOnOrder: boolean;
  leadTimeDays: number | null;
  images: CardImage[];
  colours: readonly string[];
  sizes: readonly string[];
  variants: readonly StockRow[];
  /** Told by its categories (`isClothes`): only clothing's sizes count. */
  clothes: boolean;
  sales: PricingSale[];
}

function saleBadge(sale: PricingSale): CardBadge {
  return {
    label: sale.type === "PERCENTAGE" ? `${sale.value}% off` : `${formatPence(sale.value)} off`,
    tone: "sale",
  };
}

/**
 * How many colours a shopper can choose on the piece's page now, by the
 * page's own rules (`offeredAxes`, `inStock`), so the card never promises a
 * colour the page has struck through: one in stock in any size, or every
 * colour of a piece that never runs out.
 */
function coloursToChoose(product: CardSource): number {
  const offer = toClothingOffer(offeredAxes(product, product.clothes));
  return offer ? offer.colours.filter((colour) => inStock(offer, colour, null)).length : 0;
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

  const colours = coloursToChoose(product);

  return {
    id: product.id,
    href: `/product/${product.slug}`,
    name: product.name,
    pricePence,
    wasPence: sale ? product.pricePence : product.compareAtPence,
    badges,
    image: product.images[0] ?? null,
    // One colour left is no choice to make.
    colours: colours > 1 ? colours : null,
  };
}
