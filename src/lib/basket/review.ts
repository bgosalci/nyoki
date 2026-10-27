import { fitsOffer, lineDetails, toChoices, unitsPerItem, type StoredChoices, type VariantRow } from "@/lib/basket/lines";
import { QUANTITY_MAX, unitPricePence, type SummaryRow } from "@/lib/customisation/choices";
import type { Offer } from "@/lib/customisation/offer";
import type { PostageFacts } from "@/lib/delivery/parcel";
import { formatPence } from "@/lib/money";

/**
 * The basket, priced and checked afresh: what each line costs today, and
 * what has changed since it went in.
 *
 * A line keeps its choices, never a price, so a sale starting or ending shows
 * the moment the basket is looked at. Pure: the caller hands in each line
 * with its product as it stands, and writes back the updates - a quantity
 * cut to the stock, a line taken out, a new price remembered - so each change
 * is told once.
 */

export interface ReviewProduct {
  id: string;
  slug: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  sku: string | null;
  image: string | null;
  stock: number;
  madeToOrder: boolean;
  leadTimeDays: number | null;
  oneOfAKind: boolean;
  vatRate: number;
  /** The live sale it is priced by, if any. */
  saleName: string | null;
  offer: Offer;
  variants: VariantRow[];
  /** One of it in the post: its own postage, with what it leaves out from its category's usual. */
  postage: PostageFacts;
}

export interface ReviewLine {
  id: string;
  quantity: number;
  /** What one cost when it went in. */
  addedPricePence: number;
  stored: StoredChoices;
  product: ReviewProduct;
}

export interface PricedLine {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  /** The variant's own code, else the piece's. */
  sku: string | null;
  variantId: string | null;
  variantName: string | null;
  stored: StoredChoices;
  quantity: number;
  /** The most this line could hold, beside the lines sharing its stock. */
  maxQuantity: number;
  unitPence: number;
  /** What one would cost without the sale, or at its was-price; null when neither. */
  wasUnitPence: number | null;
  saleName: string | null;
  totalPence: number;
  vatRate: number;
  details: SummaryRow[];
  madeToOrder: boolean;
  leadTimeDays: number | null;
  postage: PostageFacts;
  /** How many of the piece go in the post: a pack of three is three cards. */
  units: number;
}

export interface LineUpdate {
  id: string;
  remove?: true;
  quantity?: number;
  addedPricePence?: number;
}

export interface BasketReview {
  lines: PricedLine[];
  /** Said once, at the top of the basket. */
  changes: string[];
  updates: LineUpdate[];
  /** Pieces, not lines: a pack counts once, two cards twice. */
  pieces: number;
  subtotalPence: number;
}

/** Where a line's stock is counted, and how much there is; null for no limit. */
function stockOf(line: Pick<ReviewLine, "stored" | "product">): { key: string; available: number | null } {
  const { product, stored } = line;
  if (product.madeToOrder) return { key: `product:${product.id}`, available: null };
  if (stored.variantId !== null) {
    const variant = product.variants.find((row) => row.id === stored.variantId);
    return { key: `variant:${stored.variantId}`, available: variant?.stock ?? 0 };
  }
  return { key: `product:${product.id}`, available: product.stock };
}

/**
 * Hands out the stock to the lines in the order they went in: each gets as
 * many as it asked for while any is left. A one-of-a-kind piece is one in
 * all, however many lines it is on. Returns what each line may hold, and how
 * much of each stock is left once every line has had its share.
 */
function allocate(lines: readonly Pick<ReviewLine, "quantity" | "stored" | "product">[]) {
  const left = new Map<string, number>();
  const unique = new Map<string, number>();

  const allowed = lines.map((line) => {
    const { key, available } = stockOf(line);
    const units = unitsPerItem(line.product.offer, line.stored);

    let most = QUANTITY_MAX;
    if (available !== null) most = Math.min(most, Math.floor(Math.max(0, left.get(key) ?? available) / units));
    if (line.product.oneOfAKind) most = Math.min(most, unique.get(line.product.id) ?? 1);

    const quantity = Math.min(line.quantity, most);
    if (available !== null) left.set(key, (left.get(key) ?? available) - quantity * units);
    if (line.product.oneOfAKind) unique.set(line.product.id, (unique.get(line.product.id) ?? 1) - quantity);
    return quantity;
  });

  /** How many more of a line's piece the stock still holds. */
  const spare = (line: Pick<ReviewLine, "stored" | "product">) => {
    const { key, available } = stockOf(line);
    let more = QUANTITY_MAX;
    if (available !== null) more = Math.floor(Math.max(0, left.get(key) ?? available) / unitsPerItem(line.product.offer, line.stored));
    if (line.product.oneOfAKind) more = Math.min(more, Math.max(0, unique.get(line.product.id) ?? 1));
    return more;
  };

  return { allowed, spare };
}

/** The piece, and its colour and size where it has them: "Merino Hat in Polar / 2-3 years". */
function described(line: ReviewLine): string {
  const variant = line.product.variants.find((row) => row.id === line.stored.variantId);
  return variant ? `${line.product.name} in ${variant.name}` : line.product.name;
}

export function reviewBasket(lines: readonly ReviewLine[]): BasketReview {
  const changes: string[] = [];
  const updates: LineUpdate[] = [];

  // First, the lines that can still be bought at all.
  const buyable: ReviewLine[] = [];
  for (const line of lines) {
    const { product } = line;
    if (product.status !== "ACTIVE") {
      changes.push(`${product.name} is no longer on the shop, so we've taken it out of your basket.`);
      updates.push({ id: line.id, remove: true });
      continue;
    }
    if (!fitsOffer(product.offer, line.stored, product.variants)) {
      changes.push(`The choices for ${product.name} have changed, so we've taken it out of your basket. Please choose again.`);
      updates.push({ id: line.id, remove: true });
      continue;
    }
    buyable.push(line);
  }

  const { allowed, spare } = allocate(buyable);

  const priced: PricedLine[] = [];
  buyable.forEach((line, index) => {
    const { product } = line;
    const quantity = allowed[index];

    if (quantity === 0) {
      changes.push(`${described(line)} has sold out, so we've taken it out of your basket.`);
      updates.push({ id: line.id, remove: true });
      return;
    }

    const update: LineUpdate = { id: line.id };
    if (quantity < line.quantity) {
      changes.push(
        product.oneOfAKind
          ? `${product.name} is one of a kind, so your basket can hold only one.`
          : `There are only enough of ${described(line)} left for ${quantity}, so we've changed your ${line.quantity} to ${quantity}.`,
      );
      update.quantity = quantity;
    }

    const choices = toChoices(product.offer, line.stored, product.variants, quantity)!;
    const unitPence = unitPricePence(product.offer, choices)!;
    if (unitPence !== line.addedPricePence) {
      changes.push(`${product.name} is now ${formatPence(unitPence)} each. It was ${formatPence(line.addedPricePence)} when you added it.`);
      update.addedPricePence = unitPence;
    }
    if (Object.keys(update).length > 1) updates.push(update);

    const variant = product.variants.find((row) => row.id === line.stored.variantId) ?? null;
    priced.push({
      id: line.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      sku: variant?.sku ?? product.sku,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      stored: line.stored,
      quantity,
      maxQuantity: Math.min(QUANTITY_MAX, quantity + spare(line)),
      unitPence,
      wasUnitPence: wasUnitPence(product.offer, line.stored, unitPence),
      saleName: product.saleName,
      totalPence: unitPence * quantity,
      vatRate: product.vatRate,
      details: lineDetails(product.offer, choices),
      madeToOrder: product.madeToOrder,
      leadTimeDays: product.leadTimeDays,
      postage: product.postage,
      units: quantity * unitsPerItem(product.offer, line.stored),
    });
  });

  return {
    lines: priced,
    changes,
    updates,
    pieces: priced.reduce((sum, line) => sum + line.quantity, 0),
    subtotalPence: priced.reduce((sum, line) => sum + line.totalPence, 0),
  };
}

/** One of the line at its was-price - the sale's base, or the struck-through price - with the same extras. */
function wasUnitPence(offer: Offer, stored: StoredChoices, unitPence: number): number | null {
  const pack = offer.packs.find((p) => p.id === stored.packId);
  const unit = pack ?? offer.single;
  if (unit.wasPence === null) return null;
  return unitPence - unit.pricePence + unit.wasPence;
}

/** How many more of a piece, with these choices, the basket could take beside what it holds. */
export function roomFor(lines: readonly ReviewLine[], candidate: Pick<ReviewLine, "stored" | "product">): number {
  return allocate(lines).spare(candidate);
}

