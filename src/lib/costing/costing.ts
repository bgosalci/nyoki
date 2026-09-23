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
  profitPence: number;
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

    return {
      percent,
      salePricePence,
      profitPence: priceBreakdown({ ...input, pricePence: salePricePence }).profitPence,
    };
  });
}
