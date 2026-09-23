import { discountPenceFor } from "@/lib/pricing";

/**
 * Working a price out from what a piece costs.
 *
 * The same sums as Njomza's 2023 price lists, in integer pence throughout:
 * what goes into a piece, what the shopper pays, what VAT takes, and what is
 * left. Pure, so the admin and its tests agree on every figure.
 */

export interface CostLineInput {
  unitPence: number;
  /** Hundredths, so half a skein of yarn is 50. */
  quantityHundredths: number;
}

/** One line's cost, rounded once to the nearest penny. */
export function lineCostPence(line: CostLineInput): number {
  return Math.round((line.unitPence * line.quantityHundredths) / 100);
}

/** What a piece costs to make and send. Nothing, for one not costed yet. */
export function productionCostPence(lines: readonly CostLineInput[]): number {
  return lines.reduce((total, line) => total + lineCostPence(line), 0);
}

export interface PriceInput {
  /** What the shopper pays, VAT included. */
  pricePence: number;
  costPence: number;
  /** A whole percent: 20 for most things, 0 for children's clothing. */
  vatRate: number;
}

export interface PriceBreakdown {
  vatPence: number;
  /** What the shop keeps of the price before its own costs. */
  exVatPence: number;
  profitPence: number;
  /**
   * What is kept for each pound of cost - her sheets' "online margin". Null
   * for a piece not yet costed, rather than a division by nothing.
   */
  costMultiple: number | null;
}

/**
 * VAT is taken out of a VAT-inclusive price with the VAT fraction - rate over
 * 100 plus rate, a sixth at 20% - rounded to the nearest penny, which is how
 * HMRC works it on a single price. What is left is the price ex VAT.
 */
function vatWithin(pricePence: number, vatRate: number): number {
  return Math.round((pricePence * vatRate) / (100 + vatRate));
}

export function priceBreakdown({ pricePence, costPence, vatRate }: PriceInput): PriceBreakdown {
  const vatPence = vatWithin(pricePence, vatRate);
  const exVatPence = pricePence - vatPence;

  return {
    vatPence,
    exVatPence,
    profitPence: exVatPence - costPence,
    costMultiple: costPence > 0 ? exVatPence / costPence : null,
  };
}

/** Not On The High Street's commission, as her price lists have it. */
export const NOTHS_FEE_PERCENT = 30;

export interface NothsBreakdown {
  feePence: number;
  vatPence: number;
  profitPence: number;
}

/**
 * Selling the same piece through Not On The High Street.
 *
 * The commission is a share of what the shopper pays, and VAT is still owed
 * on that whole price. Her cards sheet works it this way; her clothes sheet
 * divides by 1.3 instead, which only takes about 23% - this follows the
 * cards.
 */
export function nothsBreakdown({ pricePence, costPence, vatRate }: PriceInput): NothsBreakdown {
  const feePence = Math.round((pricePence * NOTHS_FEE_PERCENT) / 100);
  const vatPence = vatWithin(pricePence, vatRate);

  return { feePence, vatPence, profitPence: pricePence - feePence - vatPence - costPence };
}

export interface LadderStep {
  percent: number;
  salePricePence: number;
  /** Left on the shop's own site. */
  profitPence: number;
  /** Left on Not On The High Street, at the same price less their commission. */
  nothsProfitPence: number;
}

/** Her lists work each piece down in tens, as far as half price. */
const LADDER = [10, 20, 30, 40, 50];

/**
 * What a piece would sell for, and leave, at each step of a sale.
 *
 * Priced with the shop's own discount rounding, so "at 20% off you make
 * £4.46" is true of an actual 20% sale set up in the CMS rather than an
 * approximation of one.
 */
export function discountLadder(input: PriceInput): LadderStep[] {
  return LADDER.map((percent) => {
    const salePricePence = input.pricePence - discountPenceFor(input.pricePence, { type: "PERCENTAGE", value: percent });

    const onSale = { ...input, pricePence: salePricePence };

    return {
      percent,
      salePricePence,
      profitPence: priceBreakdown(onSale).profitPence,
      nothsProfitPence: nothsBreakdown(onSale).profitPence,
    };
  });
}

/**
 * Profit as a share of what is kept after VAT - margin in its ordinary sense.
 *
 * Not the same thing as her sheets' "online margin", which is the multiple on
 * cost: a piece kept at £4.58 on £2.74 of cost is ×1.67 on cost, and a 40%
 * margin. Null when nothing is kept, rather than a division by nothing.
 */
export function marginPercent(breakdown: PriceBreakdown): number | null {
  if (breakdown.exVatPence <= 0) return null;
  return (breakdown.profitPence / breakdown.exVatPence) * 100;
}

/** How a worked-out price is tidied: to 99p, to 50p, or whichever comes first. */
export type PriceEnding = "either" | "99" | "50";

const ENDINGS: Record<PriceEnding, readonly number[]> = {
  "99": [99],
  "50": [50],
  either: [50, 99],
};

/** The first price at or above `pence` whose pence end as asked. */
export function roundUpToEnding(pence: number, ending: PriceEnding): number {
  const allowed = ENDINGS[ending];
  const pounds = Math.floor(pence / 100);

  for (const candidatePounds of [pounds, pounds + 1]) {
    for (const tail of allowed) {
      const candidate = candidatePounds * 100 + tail;
      if (candidate >= pence) return candidate;
    }
  }

  // Unreachable: the pound above always has an allowed ending above `pence`.
  return (pounds + 1) * 100 + allowed[allowed.length - 1];
}

/**
 * The tidy price, VAT included, that leaves at least the margin asked for.
 *
 * Worked from cost up: what must be kept after VAT for the margin to hold,
 * then VAT on top, then up to the next tidy ending - up, never down, so tidying
 * cannot cost margin. VAT on the result is rounded to the penny, which can
 * shave a fraction off; every answer is checked in whole pence and stepped up
 * a tidy price if it falls short. The margin is in tenths of a percent, like
 * every other percentage the admin types.
 *
 * Null with no costs to work from, or for a margin of 100% or more, which no
 * price can reach.
 */
export function priceForMargin({
  costPence,
  vatRate,
  marginTenths,
  ending,
}: {
  costPence: number;
  vatRate: number;
  marginTenths: number;
  ending: PriceEnding;
}): number | null {
  if (costPence <= 0 || marginTenths < 0 || marginTenths >= 1000) return null;

  // Kept after VAT = cost / (1 - margin); price = kept x (1 + VAT). Multiplied
  // out so there is one division, then up to the whole penny.
  const least = Math.ceil((costPence * 1000 * (100 + vatRate)) / ((1000 - marginTenths) * 100));

  let price = roundUpToEnding(least, ending);
  for (;;) {
    const { profitPence, exVatPence } = priceBreakdown({ pricePence: price, costPence, vatRate });
    if (profitPence * 1000 >= marginTenths * exVatPence) return price;
    price = roundUpToEnding(price + 1, ending);
  }
}
