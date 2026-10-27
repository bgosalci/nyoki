import "server-only";

import { db } from "@/lib/db";
import { DELIVERY_DEFAULTS, type DeliverySettingsData, type RateSource } from "@/lib/delivery/parcel";
import { usualFor, type UsualCategory } from "@/lib/delivery/usual";

/** Where postage settings live: one row, made on the first save, the defaults until then. */
export const DELIVERY_SETTINGS_ID = "delivery";

export interface DeliverySettingsView extends DeliverySettingsData {
  pricesCheckedOn: Date | null;
}

export async function deliverySettings(): Promise<DeliverySettingsView> {
  const row = await db.deliverySettings.findUnique({ where: { id: DELIVERY_SETTINGS_ID } });
  if (!row) return { ...DELIVERY_DEFAULTS, pricesCheckedOn: null };

  return {
    unweighedGrams: row.unweighedGrams,
    unweighedSize: row.unweighedSize,
    packing: {
      LETTER: { grams: row.letterPackGrams, mm: row.letterPackMm },
      LARGE_LETTER: { grams: row.largeLetterPackGrams, mm: row.largeLetterPackMm },
      SMALL_PARCEL: { grams: row.smallParcelPackGrams, mm: 0 },
      MEDIUM_PARCEL: { grams: row.mediumParcelPackGrams, mm: 0 },
    },
    pricesCheckedOn: row.pricesCheckedOn,
  };
}

/** The settings as the row holds them. */
export function settingsRow(data: DeliverySettingsData) {
  return {
    unweighedGrams: data.unweighedGrams,
    unweighedSize: data.unweighedSize,
    letterPackGrams: data.packing.LETTER.grams,
    letterPackMm: data.packing.LETTER.mm,
    largeLetterPackGrams: data.packing.LARGE_LETTER.grams,
    largeLetterPackMm: data.packing.LARGE_LETTER.mm,
    smallParcelPackGrams: data.packing.SMALL_PARCEL.grams,
    mediumParcelPackGrams: data.packing.MEDIUM_PARCEL.grams,
  };
}

/** The delivery options, with their price lists, in the order set in the admin. */
export async function rateSources({ activeOnly }: { activeOnly: boolean }): Promise<RateSource[]> {
  const rates = await db.shippingRate.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ position: "asc" }, { pricePence: "asc" }],
    select: {
      id: true,
      name: true,
      pricePence: true,
      byWeight: true,
      freeOverPence: true,
      minDays: true,
      maxDays: true,
      bands: { select: { size: true, upToGrams: true, pricePence: true }, orderBy: [{ size: "asc" }, { upToGrams: "asc" }] },
    },
  });
  return rates;
}

/** Every category with its usual postage, for looking a piece's up. */
export function postageCategories(): Promise<UsualCategory[]> {
  return db.category.findMany({
    select: { id: true, slug: true, name: true, parentId: true, usualGrams: true, usualParcelSize: true, usualThicknessMm: true },
  });
}

/** How many pieces on the shop have no weight of their own or from a category, and so count as the set weight. */
export async function unweighedCount(): Promise<number> {
  const [pieces, categories] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE", weightGrams: null }, select: { categories: { select: { categoryId: true } } } }),
    postageCategories(),
  ]);
  return pieces.filter((piece) => usualFor(piece.categories.map((link) => link.categoryId), categories)?.grams == null).length;
}
