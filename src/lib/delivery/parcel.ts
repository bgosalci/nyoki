import type { DeliveryRate } from "@/lib/checkout/totals";
import { MAX_GRAMS, MAX_THICKNESS_MM, PARCEL_SIZES, type Band, type ParcelSize } from "@/lib/delivery/royal-mail";

/**
 * What a basket costs to post, by Royal Mail's rules: the parcel its pieces
 * make - the largest size any of them needs, how much they weigh, and how
 * thick they stack while they are thin enough to go as a letter - with the
 * envelope or box for that size added once, priced from each delivery
 * option's own price list. Pure, and whole grams, millimetres and pence.
 */

/** A piece's postage as far as it is known: each part its own, else its category's usual, else null. */
export interface PostageFacts {
  grams: number | null;
  size: ParcelSize | null;
  mm: number | null;
}

export interface Packing {
  grams: number;
  /** How much thicker it makes a letter; nothing for a parcel. */
  mm: number;
}

export interface DeliverySettingsData {
  /** What a piece not weighed yet counts as, so it can still be sold. */
  unweighedGrams: number;
  unweighedSize: ParcelSize;
  /** The envelope or box each size goes in. */
  packing: Record<ParcelSize, Packing>;
}

export const DELIVERY_DEFAULTS: DeliverySettingsData = {
  unweighedGrams: 500,
  unweighedSize: "SMALL_PARCEL",
  packing: {
    LETTER: { grams: 10, mm: 1 },
    LARGE_LETTER: { grams: 40, mm: 2 },
    SMALL_PARCEL: { grams: 110, mm: 0 },
    MEDIUM_PARCEL: { grams: 300, mm: 0 },
  },
};

/** A piece's own postage, with whatever it leaves out taken from its category's usual. */
export function withUsual(own: PostageFacts, usual: PostageFacts | null): PostageFacts {
  return {
    grams: own.grams ?? usual?.grams ?? null,
    size: own.size ?? usual?.size ?? null,
    mm: own.mm ?? usual?.mm ?? null,
  };
}

/** One of a piece, as it goes in the post. */
export interface Postage {
  grams: number;
  size: ParcelSize;
  /** Thickness, for a letter or large letter; 0 for a parcel. */
  mm: number;
  /** False when it counts as the set weight because nobody has weighed it. */
  weighed: boolean;
}

/**
 * A piece's postage, with nothing left unknown. A piece not weighed counts
 * as the set weight and size, so it can be sold before it is weighed; a
 * letter whose thickness nobody gave counts as thick as its size allows, so
 * it can never make a parcel thinner than it is.
 */
export function postageOf(facts: PostageFacts, settings: Pick<DeliverySettingsData, "unweighedGrams" | "unweighedSize">): Postage {
  const size = facts.size ?? settings.unweighedSize;
  const thickest = MAX_THICKNESS_MM[size];
  return {
    grams: facts.grams ?? settings.unweighedGrams,
    size,
    mm: thickest === undefined ? 0 : (facts.mm ?? thickest),
    weighed: facts.grams !== null,
  };
}

/** A line of the basket for postage: the piece, and how many of it go - a pack of three is three. */
export interface ParcelLine {
  postage: Postage;
  units: number;
}

/** The pieces together, before their envelope or box. */
export interface Parcel {
  /** The largest size any piece needs. */
  size: ParcelSize;
  grams: number;
  /** How thick they stack; it decides anything only while every piece is letter-shaped. */
  mm: number;
}

const rank = (size: ParcelSize) => PARCEL_SIZES.indexOf(size);

export function parcelOf(lines: readonly ParcelLine[]): Parcel | null {
  const going = lines.filter((line) => line.units > 0);
  if (going.length === 0) return null;

  return {
    size: going.reduce<ParcelSize>((largest, line) => (rank(line.postage.size) > rank(largest) ? line.postage.size : largest), "LETTER"),
    grams: going.reduce((sum, line) => sum + line.postage.grams * line.units, 0),
    mm: going.reduce((sum, line) => sum + line.postage.mm * line.units, 0),
  };
}

/** A parcel packed: the size it goes as, its weight with the envelope or box, and a letter's thickness. */
export interface Packed {
  size: ParcelSize;
  grams: number;
  /** For a letter or large letter; null for a parcel. */
  mm: number | null;
}

export interface Sent extends Packed {
  pricePence: number;
}

/** The sizes a parcel could go as, packed, smallest first: its own and up, a letter size only while thin enough. */
function packedSizes(parcel: Parcel, packing: Record<ParcelSize, Packing>): Packed[] {
  const sizes: Packed[] = [];
  for (const size of PARCEL_SIZES.slice(rank(parcel.size))) {
    const grams = parcel.grams + packing[size].grams;
    const thickest = MAX_THICKNESS_MM[size];
    if (thickest === undefined) {
      sizes.push({ size, grams, mm: null });
      continue;
    }
    const mm = parcel.mm + packing[size].mm;
    if (mm <= thickest) sizes.push({ size, grams, mm });
  }
  return sizes;
}

/**
 * The cheapest way a price list sends a parcel: for each size it could go as,
 * the band its packed weight is up to and including, the cheapest of them.
 * A size the list has no price for goes as the next one up - Tracked has no
 * Letter price, so a letter goes at the Large Letter price. Null when no band
 * fits, as over 20 kg.
 */
export function sendBy(bands: readonly Band[], parcel: Parcel, packing: Record<ParcelSize, Packing>): Sent | null {
  let best: Sent | null = null;
  for (const packed of packedSizes(parcel, packing)) {
    for (const band of bands) {
      if (band.size !== packed.size || band.upToGrams < packed.grams) continue;
      if (!best || band.pricePence < best.pricePence) best = { ...packed, pricePence: band.pricePence };
    }
  }
  return best;
}

/**
 * The size a parcel goes as by Royal Mail's own limits, packed: what an
 * option with one price records, and what a piece is said to go as on its
 * own. Past 20 kg it is still a Medium Parcel, so an order can say what it was.
 */
export function naturalSize(parcel: Parcel, packing: Record<ParcelSize, Packing>): Packed {
  const sizes = packedSizes(parcel, packing);
  return sizes.find((packed) => packed.grams <= MAX_GRAMS[packed.size]) ?? sizes[sizes.length - 1];
}

/** A delivery option as it is kept: one price, or a price list. */
export interface RateSource extends DeliveryRate {
  byWeight: boolean;
  bands: readonly Band[];
}

/** An option priced for a parcel, with the parcel it would go as. */
export interface PricedRate extends DeliveryRate {
  parcel: Packed | null;
}

/**
 * Each option priced for this parcel: by its price list, or at its one price.
 * An option whose list has no band for the parcel is left out - there is no
 * price to charge.
 */
export function priceRates(rates: readonly RateSource[], parcel: Parcel | null, packing: Record<ParcelSize, Packing>): PricedRate[] {
  const priced: PricedRate[] = [];
  for (const { byWeight, bands, ...rate } of rates) {
    if (!parcel) {
      priced.push({ ...rate, parcel: null });
      continue;
    }
    if (!byWeight) {
      priced.push({ ...rate, parcel: naturalSize(parcel, packing) });
      continue;
    }
    const sent = sendBy(bands, parcel, packing);
    if (!sent) continue;
    const { pricePence, ...packed } = sent;
    priced.push({ ...rate, pricePence, parcel: packed });
  }
  return priced;
}
