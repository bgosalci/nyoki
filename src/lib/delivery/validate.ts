import type { DeliverySettingsData, Packing } from "@/lib/delivery/parcel";
import { PARCEL_SIZES, SIZE_NAMES, isLetterSize, isParcelSize, type Band, type ParcelSize } from "@/lib/delivery/royal-mail";
import { formatPence, parsePoundsToPence } from "@/lib/money";

/**
 * A delivery option, as set in Settings › Delivery: its name, its price -
 * one price, or a price list by size and weight - the goods' value it becomes
 * free at, and how many working days it takes. Checkout offers the options
 * switched on, each priced for the parcel in the basket.
 */

export interface DeliveryRateInput {
  name: string;
  /** The one price. Kept while the option is priced by size and weight, so switching back finds it. */
  pricePence: number;
  byWeight: boolean;
  /**
   * The price list, smallest size first, when the option is priced by it.
   * Left out when it is priced at one price: the list is kept as it was,
   * whatever the hidden rows hold.
   */
  bands?: Band[];
  /** Free once the goods, after any promo code, come to this much; null for never. */
  freeOverPence: number | null;
  minDays: number | null;
  maxDays: number | null;
  active: boolean;
}

export type DeliveryRateField = "name" | "price" | "bands" | "freeOver" | "minDays" | "maxDays";
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

function texts(form: FormData, key: string): string[] {
  return form.getAll(key).map((value) => (typeof value === "string" ? value.trim() : ""));
}

const bySizeThenWeight = (a: Band, b: Band) => PARCEL_SIZES.indexOf(a.size) - PARCEL_SIZES.indexOf(b.size) || a.upToGrams - b.upToGrams;

/** The price list's rows, as posted: a row left wholly empty is skipped; the first wrong row is named. */
function readBands(form: FormData): { bands: Band[] } | { error: string } {
  const sizes = texts(form, "bandSize");
  const upTos = texts(form, "bandUpTo");
  const prices = texts(form, "bandPrice");
  const bands: Band[] = [];

  for (let index = 0; index < Math.max(sizes.length, upTos.length, prices.length); index++) {
    const [size, upTo, price] = [sizes[index] ?? "", upTos[index] ?? "", prices[index] ?? ""];
    if (size === "" && upTo === "" && price === "") continue;

    const row = `Row ${index + 1}`;
    if (!isParcelSize(size)) return { error: `${row}: choose a size.` };
    const upToGrams = /^\d{1,6}$/.test(upTo) ? Number.parseInt(upTo, 10) : 0;
    if (upToGrams <= 0) return { error: `${row}: write the weight it goes up to in whole grams, like 2000.` };
    const pricePence = parsePoundsToPence(price);
    if (pricePence === null) return { error: `${row}: write the price as pounds and pence, like 2.90.` };

    const twice = bands.find((band) => band.size === size && band.upToGrams === upToGrams);
    if (twice) return { error: `Two rows are for a ${SIZE_NAMES[size]} up to ${upToGrams} g. Remove one.` };
    bands.push({ size, upToGrams, pricePence });
  }

  if (bands.length === 0) return { error: "Add a price for at least one size, or fill in Royal Mail's prices." };
  return { bands: bands.sort(bySizeThenWeight) };
}

export function validateDeliveryRate(form: FormData): DeliveryRateValidation {
  const errors: DeliveryRateErrors = {};

  const name = text(form, "name");
  if (name === "") errors.name = "Give it a name shoppers will recognise, like Royal Mail Tracked 48.";

  const byWeight = text(form, "priced") === "weight";

  // Priced by its list, the one price is only kept, hidden: it cannot be put
  // right from the form, so one that cannot be read is simply not kept.
  const pricePence = parsePoundsToPence(text(form, "price"));
  if (pricePence === null && !byWeight) errors.price = "Write the price as pounds and pence, like 3.95.";

  let bands: Band[] | undefined;
  if (byWeight) {
    const read = readBands(form);
    if ("error" in read) errors.bands = read.error;
    else bands = read.bands;
  }

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
    data: {
      name,
      pricePence: pricePence ?? 0,
      byWeight,
      ...(bands ? { bands } : {}),
      freeOverPence,
      minDays: minDays ?? null,
      maxDays: maxDays ?? null,
      active: form.get("active") !== null,
    },
  };
}

/** What an option charges, for the list of options: its one price, or the range of its price list. */
export function priceRange({ byWeight, pricePence, bands }: { byWeight: boolean; pricePence: number; bands: readonly Band[] }): string {
  if (!byWeight) return pricePence === 0 ? "Free" : formatPence(pricePence);
  if (bands.length === 0) return "By size and weight · no prices yet";
  const prices = bands.map((band) => band.pricePence);
  const [low, high] = [Math.min(...prices), Math.max(...prices)];
  return `By size and weight · ${low === high ? formatPence(low) : `${formatPence(low)} to ${formatPence(high)}`}`;
}

export type DeliverySettingsErrors = Partial<Record<string, string>>;

export type DeliverySettingsValidation = { ok: true; data: DeliverySettingsData } | { ok: false; errors: DeliverySettingsErrors };

/**
 * The packing for each size - the envelope's or box's weight, and how much
 * thicker an envelope makes a letter - and what a piece not weighed counts
 * as. Fields are named "LARGE_LETTER.grams" and so on, and so are the errors.
 */
export function validateDeliverySettings(form: FormData): DeliverySettingsValidation {
  const errors: DeliverySettingsErrors = {};
  const whole = (raw: string) => (/^\d{1,5}$/.test(raw) ? Number.parseInt(raw, 10) : null);

  const packing = {} as Record<ParcelSize, Packing>;
  for (const size of PARCEL_SIZES) {
    const grams = whole(text(form, `${size}.grams`));
    if (grams === null) errors[`${size}.grams`] = `Whole grams, like ${size === "SMALL_PARCEL" ? 110 : 10}.`;
    let mm = 0;
    if (isLetterSize(size)) {
      const read = whole(text(form, `${size}.mm`));
      if (read === null) errors[`${size}.mm`] = "Whole millimetres, like 2.";
      mm = read ?? 0;
    }
    packing[size] = { grams: grams ?? 0, mm };
  }

  const unweighedGrams = whole(text(form, "unweighedGrams"));
  if (unweighedGrams === null || unweighedGrams === 0) errors.unweighedGrams = "Write a weight in whole grams, like 500.";

  const unweighedSize = text(form, "unweighedSize");
  if (!isParcelSize(unweighedSize)) errors.unweighedSize = "Choose a size.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { unweighedGrams: unweighedGrams!, unweighedSize: unweighedSize as ParcelSize, packing } };
}

/** How long an option takes, as a shopper reads it: "2 to 3 working days"; null when not said. */
export function deliveryDays({ minDays, maxDays }: { minDays: number | null; maxDays: number | null }): string | null {
  const unit = (n: number) => (n === 1 ? "working day" : "working days");
  if (minDays !== null && maxDays !== null) return minDays === maxDays ? `${minDays} ${unit(minDays)}` : `${minDays} to ${maxDays} working days`;
  if (maxDays !== null) return `Up to ${maxDays} ${unit(maxDays)}`;
  if (minDays !== null) return `${minDays} ${unit(minDays)} or more`;
  return null;
}
