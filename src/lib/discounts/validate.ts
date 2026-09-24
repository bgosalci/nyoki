import { formatPence, parsePoundsToPence } from "@/lib/money";
import type { SaleType } from "@/lib/sales/validate";

const TYPES: readonly SaleType[] = ["PERCENTAGE", "FIXED_AMOUNT"];

/** Letters, numbers and dashes only - anything else is fumbled when typed or read aloud. */
const CODE = /^[A-Z0-9-]{3,}$/;

export interface DiscountCodeInput {
  code: string;
  type: SaleType;
  /** Whole percent for PERCENTAGE, pence for FIXED_AMOUNT. */
  value: number;
  minSpendPence: number | null;
  usageLimit: number | null;
  startsAt: Date;
  endsAt: Date | null;
  active: boolean;
}

export type DiscountCodeField = keyof DiscountCodeInput | "minSpend";

export type DiscountCodeErrors = Partial<Record<DiscountCodeField, string>>;

export type DiscountCodeValidation =
  | { ok: true; data: DiscountCodeInput }
  | { ok: false; errors: DiscountCodeErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function dateTime(value: string): Date | null | undefined {
  if (value.length === 0) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Codes are stored and compared upper-cased, with spaces removed. */
export function normaliseCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function validateDiscountCodeInput(form: FormData): DiscountCodeValidation {
  const errors: DiscountCodeErrors = {};

  const code = normaliseCode(text(form, "code"));
  if (code.length === 0) {
    errors.code = "Give the code something to type.";
  } else if (!CODE.test(code)) {
    errors.code = "Use letters, numbers and dashes only, at least three characters.";
  }

  const typeRaw = text(form, "type");
  const type = TYPES.includes(typeRaw as SaleType) ? (typeRaw as SaleType) : null;
  if (type === null) errors.type = "Choose percent off or pounds off.";

  const valueRaw = text(form, "value");
  let value: number | null = null;

  if (type === "PERCENTAGE") {
    if (!/^\d+$/.test(valueRaw)) {
      errors.value = "Percent off has to be a whole number.";
    } else {
      const percent = Number.parseInt(valueRaw, 10);
      if (percent < 1 || percent > 100) errors.value = "Percent off has to be between 1 and 100.";
      else value = percent;
    }
  } else if (type === "FIXED_AMOUNT") {
    const pence = parsePoundsToPence(valueRaw);
    if (pence === null) errors.value = "Write the amount as pounds and pence, like 5.00.";
    else if (pence === 0) errors.value = "Pounds off has to be more than nothing.";
    else value = pence;
  }

  const minSpendRaw = text(form, "minSpend");
  let minSpendPence: number | null = null;
  if (minSpendRaw.length > 0) {
    const pence = parsePoundsToPence(minSpendRaw);
    if (pence === null) errors.minSpend = "Write the minimum as pounds and pence, like 25.00.";
    else minSpendPence = pence;
  }

  const limitRaw = text(form, "usageLimit");
  let usageLimit: number | null = null;
  if (limitRaw.length > 0) {
    if (!/^\d+$/.test(limitRaw) || Number.parseInt(limitRaw, 10) === 0) {
      errors.usageLimit = "A limit has to be a whole number, at least one. Leave blank for no limit.";
    } else {
      usageLimit = Number.parseInt(limitRaw, 10);
    }
  }

  const startsAt = dateTime(text(form, "startsAt"));
  if (startsAt === undefined) errors.startsAt = "Choose when the code starts working.";
  else if (startsAt === null) errors.startsAt = "That start date could not be read.";

  const endsAt = dateTime(text(form, "endsAt"));
  if (endsAt === null) errors.endsAt = "That end date could not be read.";
  else if (endsAt && startsAt && endsAt.getTime() <= startsAt.getTime()) {
    errors.endsAt = "The end has to be after the start.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      code,
      type: type!,
      value: value!,
      minSpendPence,
      usageLimit,
      startsAt: startsAt!,
      endsAt: endsAt ?? null,
      active: form.get("active") !== null,
    },
  };
}

export interface RedeemableCode {
  type: SaleType;
  value: number;
  minSpendPence: number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: Date;
  endsAt: Date | null;
  active: boolean;
}

export type Redeemability =
  | { ok: true; discountPence: number }
  | { ok: false; reason: string };

/**
 * Whether a code can be used on this basket, and what it takes off.
 *
 * Every reason a code is unavailable reads the same. Saying "that code has
 * expired" or "not started yet" confirms the code exists, which invites
 * guessing at neighbouring ones. A minimum spend is different: the shopper can
 * act on it, so it says so plainly.
 */
/**
 * Whether a shopper could use the code at `now`, whatever their basket:
 * switched on, started, not ended, not used up. A minimum spend is the
 * shopper's to meet, so it does not make a code any less live. Checkout
 * decides by it, and the admin's Overview counts by it.
 */
export function codeIsLive(
  code: Pick<RedeemableCode, "active" | "startsAt" | "endsAt" | "usageLimit" | "usedCount">,
  now: Date,
): boolean {
  if (!code.active) return false;
  if (code.startsAt.getTime() > now.getTime()) return false;
  if (code.endsAt !== null && code.endsAt.getTime() <= now.getTime()) return false;
  if (code.usageLimit !== null && code.usedCount >= code.usageLimit) return false;
  return true;
}

export function codeRedeemability(
  code: RedeemableCode,
  { now, subtotalPence }: { now: Date; subtotalPence: number },
): Redeemability {
  const unavailable = { ok: false as const, reason: "That code is not available." };

  if (!codeIsLive(code, now)) return unavailable;

  if (code.minSpendPence !== null && subtotalPence < code.minSpendPence) {
    return { ok: false, reason: `That code needs a basket of ${formatPence(code.minSpendPence)} or more.` };
  }

  const raw = code.type === "PERCENTAGE" ? Math.round((subtotalPence * code.value) / 100) : code.value;

  return { ok: true, discountPence: Math.min(Math.max(raw, 0), subtotalPence) };
}
