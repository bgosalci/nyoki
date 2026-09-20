import { parsePoundsToPence } from "@/lib/money";

/**
 * Changing the price of many products at once.
 *
 * Pure: prices in, prices out. The server action re-runs this against the
 * database rows, so nothing the browser calculates is ever trusted.
 *
 * Every amount is an integer number of pence, and a percentage is carried as
 * TENTHS of a percent (12.5% is 125). Unlike a sale - where a fractional
 * percentage would produce sub-penny discounts off every future basket - the
 * result here is rounded once and stored as the price, so a 2.5% rise is
 * exactly representable and worth allowing.
 */

export const REPRICE_MODES = ["SET", "INCREASE", "DECREASE"] as const;
export const REPRICE_UNITS = ["AMOUNT", "PERCENT"] as const;
export const REPRICE_ROUNDINGS = ["EXACT", "TEN_PENCE", "FIFTY_PENCE", "POUND"] as const;

export type RepriceMode = (typeof REPRICE_MODES)[number];
export type RepriceUnit = (typeof REPRICE_UNITS)[number];
export type RepriceRounding = (typeof REPRICE_ROUNDINGS)[number];

export interface Reprice {
  mode: RepriceMode;
  unit: RepriceUnit;
  /** Pence when the unit is AMOUNT, tenths of a percent when it is PERCENT. */
  value: number;
  rounding: RepriceRounding;
}

/** No bulk change ever produces a free product; that has to be a deliberate edit. */
export const MIN_PRICE_PENCE = 1;

const STEP: Record<RepriceRounding, number> = {
  EXACT: 1,
  TEN_PENCE: 10,
  FIFTY_PENCE: 50,
  POUND: 100,
};

// Digits with at most one decimal place. Deliberately no exponent and no sign:
// "1e3" and "-5" are typing mistakes, not percentages. How big a percentage is
// sensible is a separate question, answered in validation with a message that
// says so - refusing "1010" as unreadable would be a lie.
const PERCENT = /^(\d{1,6})(?:\.(\d))?\s*%?$/;

/** A tenfold rise. Past this it is far likelier to be a slip than an intention. */
const MAX_PERCENT_TENTHS = 10_000;

/**
 * Parse a typed percentage into tenths of a percent.
 *
 * Returns null for anything finer than a tenth rather than rounding it away,
 * the same bargain `parsePoundsToPence` strikes with sub-penny amounts.
 */
export function parsePercentToTenths(input: string): number | null {
  const match = PERCENT.exec(input.trim());
  if (!match) return null;

  const [, whole, tenth] = match;

  return Number.parseInt(whole, 10) * 10 + (tenth ? Number.parseInt(tenth, 10) : 0);
}

function roundTo(pence: number, step: number): number {
  if (step <= 1) return pence;

  const rounded = Math.round(pence / step) * step;

  // A 40p item rounded to the nearest pound is not free; it is a pound.
  return rounded === 0 && pence > 0 ? step : rounded;
}

/** What `currentPence` becomes under this change. Always a whole penny, never free. */
export function repricedPence(currentPence: number, reprice: Reprice): number {
  const { mode, unit, value, rounding } = reprice;

  let next: number;

  if (mode === "SET") {
    next = value;
  } else if (unit === "AMOUNT") {
    next = mode === "INCREASE" ? currentPence + value : currentPence - value;
  } else {
    // Integer arithmetic throughout: multiply first, divide once, round once.
    const tenths = mode === "INCREASE" ? 1000 + value : 1000 - value;
    next = Math.round((currentPence * tenths) / 1000);
  }

  return Math.max(roundTo(next, STEP[rounding]), MIN_PRICE_PENCE);
}

export interface RepriceableProduct {
  pricePence: number;
  compareAtPence: number | null;
}

export interface RepricedProduct extends RepriceableProduct {
  changed: boolean;
}

/**
 * A repriced product, was-price included.
 *
 * A was-price the new price has caught up with is cleared rather than kept:
 * left alone it would show a struck-through figure at or below what is being
 * charged, and the product form rejects that combination on the next edit.
 */
export function repriceProduct(product: RepriceableProduct, reprice: Reprice): RepricedProduct {
  const pricePence = repricedPence(product.pricePence, reprice);
  const compareAtPence =
    product.compareAtPence !== null && product.compareAtPence > pricePence ? product.compareAtPence : null;

  return {
    pricePence,
    compareAtPence,
    changed: pricePence !== product.pricePence || compareAtPence !== product.compareAtPence,
  };
}

export type RepriceField = "mode" | "unit" | "value" | "rounding";
export type RepriceErrors = Partial<Record<RepriceField, string>>;

export interface RepriceFields {
  mode: string;
  unit: string;
  value: string;
  rounding: string;
}

export type RepriceValidation = { ok: true; data: Reprice } | { ok: false; errors: RepriceErrors };

/** Validate what the dialog collected. Runs again on the server for every request. */
export function validateRepriceInput(fields: RepriceFields): RepriceValidation {
  const errors: RepriceErrors = {};

  const mode = fields.mode as RepriceMode;
  const unit = fields.unit as RepriceUnit;
  const rounding = fields.rounding as RepriceRounding;

  if (!REPRICE_MODES.includes(mode)) errors.mode = "Choose whether to set, raise or lower the price.";
  if (!REPRICE_UNITS.includes(unit)) errors.unit = "Choose an amount or a percentage.";
  if (!REPRICE_ROUNDINGS.includes(rounding)) errors.rounding = "Choose how to round the new price.";

  if (mode === "SET" && unit === "PERCENT") {
    errors.unit = "A price can only be set to an amount, not a percentage.";
  }

  const raw = fields.value.trim();
  let value: number | null = null;

  if (raw.length === 0) {
    errors.value = mode === "SET" ? "Give the new price." : "Say how much to change the price by.";
  } else if (!errors.unit) {
    value = unit === "AMOUNT" ? parsePoundsToPence(raw) : parsePercentToTenths(raw);

    if (value === null) {
      errors.value =
        unit === "AMOUNT"
          ? "Write the amount as pounds and pence, like 2.50."
          : "Write the percentage as a number, like 10 or 12.5.";
    } else if (value === 0) {
      errors.value = mode === "SET" ? "A price has to be more than nothing." : "That would not change anything.";
    } else if (mode === "DECREASE" && unit === "PERCENT" && value > 1000) {
      errors.value = "A reduction cannot be more than 100%.";
    } else if (unit === "PERCENT" && value > MAX_PERCENT_TENTHS) {
      errors.value = "That is over 1,000% - check the figure.";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, data: { mode, unit, value: value!, rounding } };
}
