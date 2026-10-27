/**
 * Royal Mail's sizes, and its published prices for the services a shop like
 * this sends by. Royal Mail has no price API open to shops, so each delivery
 * option keeps its own price list, filled in from these and changed by hand
 * when Royal Mail changes its prices - usually each April.
 *
 * These are the online prices (bought through Click & Drop), as Royal Mail's
 * own pages gave them on 27 October 2026, in force from 5 October 2026.
 */

/** Smallest first: a parcel can always go as a larger size than it needs. */
export const PARCEL_SIZES = ["LETTER", "LARGE_LETTER", "SMALL_PARCEL", "MEDIUM_PARCEL"] as const;
export type ParcelSize = (typeof PARCEL_SIZES)[number];

export const SIZE_NAMES: Record<ParcelSize, string> = {
  LETTER: "Letter",
  LARGE_LETTER: "Large Letter",
  SMALL_PARCEL: "Small Parcel",
  MEDIUM_PARCEL: "Medium Parcel",
};

/** The thickest a letter and a large letter can be. A parcel is judged by weight alone. */
export const MAX_THICKNESS_MM: Partial<Record<ParcelSize, number>> = { LETTER: 5, LARGE_LETTER: 25 };

/** The heaviest each size can be at 1st and 2nd Class. Tracked takes a Large Letter to 1 kg, which its own price list says. */
export const MAX_GRAMS: Record<ParcelSize, number> = { LETTER: 100, LARGE_LETTER: 750, SMALL_PARCEL: 2000, MEDIUM_PARCEL: 20000 };

export function isLetterSize(size: ParcelSize): boolean {
  return MAX_THICKNESS_MM[size] !== undefined;
}

export function isParcelSize(value: unknown): value is ParcelSize {
  return typeof value === "string" && (PARCEL_SIZES as readonly string[]).includes(value);
}

/** One line of a price list: this size, up to and including this weight, costs this much. */
export interface Band {
  size: ParcelSize;
  upToGrams: number;
  pricePence: number;
}

export interface RoyalMailService {
  key: string;
  name: string;
  minDays: number;
  maxDays: number;
  bands: readonly Band[];
}

export const ROYAL_MAIL_PRICES_FROM = "5 October 2026";

const band = (size: ParcelSize, upToGrams: number, pricePence: number): Band => ({ size, upToGrams, pricePence });

export const ROYAL_MAIL_SERVICES: readonly RoyalMailService[] = [
  {
    key: "tracked-48",
    name: "Royal Mail Tracked 48",
    minDays: 2,
    maxDays: 3,
    bands: [
      band("LARGE_LETTER", 1000, 290),
      band("SMALL_PARCEL", 2000, 375),
      band("MEDIUM_PARCEL", 2000, 570),
      band("MEDIUM_PARCEL", 10000, 755),
      band("MEDIUM_PARCEL", 20000, 1225),
    ],
  },
  {
    key: "tracked-24",
    name: "Royal Mail Tracked 24",
    minDays: 1,
    maxDays: 2,
    bands: [
      band("LARGE_LETTER", 1000, 390),
      band("SMALL_PARCEL", 2000, 480),
      band("MEDIUM_PARCEL", 2000, 675),
      band("MEDIUM_PARCEL", 10000, 880),
      band("MEDIUM_PARCEL", 20000, 1430),
    ],
  },
  {
    key: "1st-class",
    name: "Royal Mail 1st Class",
    minDays: 1,
    maxDays: 2,
    bands: [
      band("LETTER", 100, 180),
      band("LARGE_LETTER", 100, 320),
      band("LARGE_LETTER", 250, 330),
      band("LARGE_LETTER", 500, 330),
      band("LARGE_LETTER", 750, 330),
      band("SMALL_PARCEL", 2000, 570),
      band("MEDIUM_PARCEL", 2000, 820),
      band("MEDIUM_PARCEL", 10000, 1040),
      band("MEDIUM_PARCEL", 20000, 1640),
    ],
  },
  {
    key: "2nd-class",
    name: "Royal Mail 2nd Class",
    minDays: 2,
    maxDays: 3,
    bands: [
      band("LETTER", 100, 91),
      band("LARGE_LETTER", 100, 155),
      band("LARGE_LETTER", 250, 190),
      band("LARGE_LETTER", 500, 240),
      band("LARGE_LETTER", 750, 270),
      band("SMALL_PARCEL", 2000, 440),
      band("MEDIUM_PARCEL", 2000, 700),
      band("MEDIUM_PARCEL", 10000, 900),
      band("MEDIUM_PARCEL", 20000, 1370),
    ],
  },
];

export function royalMailService(key: string): RoyalMailService | null {
  return ROYAL_MAIL_SERVICES.find((service) => service.key === key) ?? null;
}
