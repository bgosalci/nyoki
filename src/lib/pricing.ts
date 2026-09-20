/**
 * Sale pricing.
 *
 * Every amount here is an integer number of pence. Percentages are whole
 * numbers (20 means 20%). No value in this module is ever a float in pounds.
 */

export type PricingSaleType = "PERCENTAGE" | "FIXED_AMOUNT";

/** The subset of a Sale row this module needs. */
export interface PricingSale {
  id: string;
  type: PricingSaleType;
  value: number;
  startsAt: Date;
  /** null means the sale runs until it is switched off. */
  endsAt: Date | null;
  active: boolean;
}

export interface EffectivePrice<T extends PricingSale = PricingSale> {
  /** What the customer pays. */
  pricePence: number;
  /** The undiscounted price, for showing struck through. */
  basePricePence: number;
  discountPence: number;
  /** The sale that produced the discount, if any - the caller's own row. */
  sale: T | null;
}

/**
 * The discount a sale takes off a given price.
 *
 * Always lands between 0 and the full price, so a misconfigured sale can
 * reduce an item to free but never below it, and never inflates the price.
 */
export function discountPenceFor(pricePence: number, sale: PricingSale): number {
  const raw =
    sale.type === "PERCENTAGE"
      ? Math.round((pricePence * sale.value) / 100)
      : sale.value;

  return clamp(raw, 0, pricePence);
}

/** Whether a sale is live at `now`: start is inclusive, end is exclusive. */
function isLive(sale: PricingSale, now: Date): boolean {
  if (!sale.active) return false;
  if (sale.startsAt.getTime() > now.getTime()) return false;
  if (sale.endsAt !== null && sale.endsAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * The live sale that saves the customer the most on `pricePence`.
 *
 * Products can sit in several overlapping sales at once - a batch sale across a
 * category plus a one-off on a single item, say. Rather than stacking them
 * (which compounds into surprise near-free orders), the best single one wins.
 */
export function activeSaleFor<T extends PricingSale>(
  sales: readonly T[],
  pricePence: number,
  now: Date,
): T | null {
  let best: T | null = null;
  let bestDiscount = 0;

  for (const sale of sales) {
    if (!isLive(sale, now)) continue;

    const discount = discountPenceFor(pricePence, sale);
    if (discount > bestDiscount) {
      best = sale;
      bestDiscount = discount;
    }
  }

  return best;
}

/** What a product actually costs right now, given the sales it belongs to. */
export function effectivePricePence<T extends PricingSale>(
  basePricePence: number,
  sales: readonly T[],
  now: Date,
): EffectivePrice<T> {
  const sale = activeSaleFor(sales, basePricePence, now);
  const discountPence = sale ? discountPenceFor(basePricePence, sale) : 0;

  return {
    pricePence: basePricePence - discountPence,
    basePricePence,
    discountPence,
    sale,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
