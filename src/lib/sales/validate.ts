import { parsePoundsToPence } from "@/lib/money";

export type SaleType = "PERCENTAGE" | "FIXED_AMOUNT";

const TYPES: readonly SaleType[] = ["PERCENTAGE", "FIXED_AMOUNT"];

export interface SaleInput {
  name: string;
  type: SaleType;
  /** Whole percent for PERCENTAGE, pence for FIXED_AMOUNT. */
  value: number;
  startsAt: Date;
  endsAt: Date | null;
  active: boolean;
  productIds: string[];
}

export type SaleField = keyof SaleInput;

export type SaleErrors = Partial<Record<SaleField, string>>;

export type SaleValidation =
  | { ok: true; data: SaleInput }
  | { ok: false; errors: SaleErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Parse a datetime-local value; undefined when blank, null when unreadable. */
function dateTime(value: string): Date | null | undefined {
  if (value.length === 0) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Validate a sale form submission. Collects every error at once.
 */
export function validateSaleInput(form: FormData): SaleValidation {
  const errors: SaleErrors = {};

  const name = text(form, "name");
  if (name.length === 0) errors.name = "Give the sale a name.";

  const typeRaw = text(form, "type");
  const type = TYPES.includes(typeRaw as SaleType) ? (typeRaw as SaleType) : null;
  if (type === null) errors.type = "Choose percent off or pounds off.";

  const valueRaw = text(form, "value");
  let value: number | null = null;

  if (type === "PERCENTAGE") {
    // Whole percents only: 12.5% produces sub-penny discounts on most prices.
    if (!/^\d+$/.test(valueRaw)) {
      errors.value = "Percent off has to be a whole number.";
    } else {
      const percent = Number.parseInt(valueRaw, 10);
      if (percent < 1 || percent > 100) {
        errors.value = "Percent off has to be between 1 and 100.";
      } else {
        value = percent;
      }
    }
  } else if (type === "FIXED_AMOUNT") {
    const pence = parsePoundsToPence(valueRaw);
    if (pence === null) {
      errors.value = "Write the amount as pounds and pence, like 5.00.";
    } else if (pence === 0) {
      errors.value = "Pounds off has to be more than nothing.";
    } else {
      value = pence;
    }
  }

  const startsAt = dateTime(text(form, "startsAt"));
  if (startsAt === undefined) {
    errors.startsAt = "Choose when the sale starts.";
  } else if (startsAt === null) {
    errors.startsAt = "That start date could not be read.";
  }

  const endsAt = dateTime(text(form, "endsAt"));
  if (endsAt === null) {
    errors.endsAt = "That end date could not be read.";
  } else if (endsAt && startsAt && endsAt.getTime() <= startsAt.getTime()) {
    errors.endsAt = "The end has to be after the start.";
  }

  const productIds = [
    ...new Set(
      form
        .getAll("productIds")
        .filter((entry): entry is string => typeof entry === "string")
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  ];
  if (productIds.length === 0) {
    errors.productIds = "Pick at least one product for the sale.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      name,
      type: type!,
      value: value!,
      startsAt: startsAt!,
      endsAt: endsAt ?? null,
      active: form.get("active") !== null,
      productIds,
    },
  };
}
