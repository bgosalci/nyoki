import { parsePoundsToPence } from "@/lib/money";

/**
 * A delivery option, as set in Settings › Delivery: its name, price, the
 * goods' value it becomes free at, and how many working days it takes.
 * Checkout offers the options switched on, cheapest first.
 */

export interface DeliveryRateInput {
  name: string;
  pricePence: number;
  /** Free once the goods, after any promo code, come to this much; null for never. */
  freeOverPence: number | null;
  minDays: number | null;
  maxDays: number | null;
  active: boolean;
}

export type DeliveryRateField = "name" | "price" | "freeOver" | "minDays" | "maxDays";
export type DeliveryRateErrors = Partial<Record<DeliveryRateField, string>>;

export type DeliveryRateValidation = { ok: true; data: DeliveryRateInput } | { ok: false; errors: DeliveryRateErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const DAYS = "Write a whole number of days, or leave it blank.";

function days(raw: string): number | null | undefined {
  if (raw === "") return null;
  return /^\d{1,3}$/.test(raw) ? Number.parseInt(raw, 10) : undefined;
}

export function validateDeliveryRate(form: FormData): DeliveryRateValidation {
  const errors: DeliveryRateErrors = {};

  const name = text(form, "name");
  if (name === "") errors.name = "Give it a name shoppers will recognise, like Royal Mail Tracked 48.";

  const pricePence = parsePoundsToPence(text(form, "price"));
  if (pricePence === null) errors.price = "Write the price as pounds and pence, like 3.95.";

  const freeOverRaw = text(form, "freeOver");
  const freeOverPence = freeOverRaw === "" ? null : parsePoundsToPence(freeOverRaw);
  if (freeOverRaw !== "" && freeOverPence === null) errors.freeOver = "Write the amount as pounds and pence, like 40.00, or leave it blank.";

  const minDays = days(text(form, "minDays"));
  const maxDays = days(text(form, "maxDays"));
  if (minDays === undefined) errors.minDays = DAYS;
  if (maxDays === undefined) errors.maxDays = DAYS;
  else if (minDays !== undefined && minDays !== null && maxDays !== null && maxDays < minDays) {
    errors.maxDays = "The longest has to be at least the shortest.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: { name, pricePence: pricePence!, freeOverPence, minDays: minDays ?? null, maxDays: maxDays ?? null, active: form.get("active") !== null },
  };
}

/** How long an option takes, as a shopper reads it: "2 to 3 working days"; null when not said. */
export function deliveryDays({ minDays, maxDays }: { minDays: number | null; maxDays: number | null }): string | null {
  const unit = (n: number) => (n === 1 ? "working day" : "working days");
  if (minDays !== null && maxDays !== null) return minDays === maxDays ? `${minDays} ${unit(minDays)}` : `${minDays} to ${maxDays} working days`;
  if (maxDays !== null) return `Up to ${maxDays} ${unit(maxDays)}`;
  if (minDays !== null) return `${minDays} ${unit(minDays)} or more`;
  return null;
}
