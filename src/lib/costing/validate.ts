import type { EntryLine } from "@/lib/costing/import";
import { parsePoundsToPence } from "@/lib/money";

/** The UK's rates: standard, reduced, and zero - children's clothing is zero. */
export const VAT_RATES = [20, 5, 0] as const;

export type VatRate = (typeof VAT_RATES)[number];

// Digits, then at most two decimal places. No sign and no exponent.
const QUANTITY = /^(\d{1,6})(?:\.(\d{1,2}))?$/;

/**
 * A typed quantity in hundredths - "6.5" skeins is 650.
 *
 * Read as whole digits either side of the point, like prices, so it is exact
 * by construction; anything finer than a hundredth is refused rather than
 * rounded away.
 */
export function parseQuantityToHundredths(input: string): number | null {
  const match = QUANTITY.exec(input.trim());
  if (!match) return null;

  const [, whole, fraction] = match;
  return Number.parseInt(whole, 10) * 100 + (fraction ? Number.parseInt(fraction.padEnd(2, "0"), 10) : 0);
}

export interface PricingInput {
  pricePence: number;
  compareAtPence: number | null;
  vatRate: VatRate;
  lines: EntryLine[];
}

export type PricingField = "price" | "compareAtPrice" | "vatRate" | "lines";
export type PricingErrors = Partial<Record<PricingField, string>>;

export type PricingValidation = { ok: true; data: PricingInput } | { ok: false; errors: PricingErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function all(form: FormData, key: string): string[] {
  return form.getAll(key).map((value) => (typeof value === "string" ? value.trim() : ""));
}

/**
 * The lines of what something costs, as posted by `CostLinesTable`: a piece's
 * own costs, or a category's usual ones. The first line wrong is named.
 */
export function parseCostLines(form: FormData): { ok: true; lines: EntryLine[] } | { ok: false; error: string } {
  const labels = all(form, "lineLabel");
  const units = all(form, "lineUnit");
  const quantities = all(form, "lineQuantity");

  const lines: EntryLine[] = [];
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i] ?? "";
    const unit = units[i] ?? "";
    const quantity = quantities[i] ?? "";

    // A spare row left empty is not a line.
    if (label.length === 0 && unit.length === 0 && quantity.length === 0) continue;

    const where = `Line ${i + 1}`;
    if (label.length === 0) return { ok: false, error: `${where} has a cost but no name. Say what it is.` };

    const unitPence = parsePoundsToPence(unit.length > 0 ? unit : "0");
    if (unitPence === null) return { ok: false, error: `${where}: write the cost as pounds and pence, like 0.22.` };

    const quantityHundredths = quantity.length > 0 ? parseQuantityToHundredths(quantity) : 100;
    if (quantityHundredths === null || quantityHundredths === 0) {
      return { ok: false, error: `${where}: write the quantity as a number, like 1 or 2.5.` };
    }

    lines.push({ label, unitPence, quantityHundredths });
  }

  return { ok: true, lines };
}

/**
 * The pricing form: a price, a VAT rate, and the lines of what a piece costs.
 *
 * A piece may be priced before it is costed - most of the catalogue was - so
 * no lines at all is fine. A price of nothing is not.
 */
export function validatePricingInput(form: FormData): PricingValidation {
  const errors: PricingErrors = {};

  const priceRaw = text(form, "price");
  const pricePence = parsePoundsToPence(priceRaw);
  if (priceRaw.length === 0 || pricePence === 0) {
    errors.price = "Give the piece a price. At nothing it would be given away.";
  } else if (pricePence === null) {
    errors.price = "Write the price as pounds and pence, like 8.50.";
  }

  let compareAtPence: number | null = null;
  const compareRaw = text(form, "compareAtPrice");
  if (compareRaw.length > 0) {
    const parsed = parsePoundsToPence(compareRaw);
    if (parsed === null) {
      errors.compareAtPrice = "Write the was-price as pounds and pence, like 10.00.";
    } else if (pricePence !== null && parsed <= pricePence) {
      errors.compareAtPrice = "The was-price has to be higher than the price, or there is nothing to strike through.";
    } else {
      compareAtPence = parsed;
    }
  }

  const vatRate = Number.parseInt(text(form, "vatRate"), 10) as VatRate;
  if (!VAT_RATES.includes(vatRate)) errors.vatRate = "Choose 20%, 5% or zero-rated.";

  const costs = parseCostLines(form);
  if (!costs.ok) errors.lines = costs.error;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, data: { pricePence: pricePence!, compareAtPence, vatRate, lines: costs.ok ? costs.lines : [] } };
}
