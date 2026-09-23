/**
 * Matching rows of Njomza's price lists to the catalogue.
 *
 * The lists name nothing: each piece is identified by a photograph in its
 * first column. So matching compares photographs, by perceptual hash, and
 * uses the photo's filename as a second opinion.
 *
 * The thresholds come from measuring her actual files against the actual
 * catalogue: 51 of 136 photos land within 8 bits of one of ours and are the
 * same picture; the next 12, at 9-12 bits, were right only a third of the
 * time; beyond that nothing matched at all.
 */

/** Within this many bits, it is the same photograph saved again. */
export const CONFIDENT_DISTANCE = 8;

/**
 * How much nearer the best product must be than the next. Two colourways
 * photographed on the same background can hash alike, and choosing between
 * them would put one's costs on the other without anyone noticing.
 */
const CLEAR_MARGIN = 6;

/** Where there is no photo to compare, a middling distance: no evidence either way. */
const NO_PHOTO = 32;

/** Each shared word is worth this many bits of photo evidence when ranking. */
const WORD_WEIGHT = 6;

const HOW_MANY = 8;

/** Set bits in each value a hex digit can take. */
const BITS_IN_NIBBLE = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

/**
 * Bits two 64-bit hex hashes differ in, compared a hex digit at a time - a
 * 64-bit value does not fit a JavaScript number, and the project's target
 * predates BigInt literals.
 */
export function hammingDistance(a: string, b: string): number {
  let bits = 0;
  for (let i = 0; i < a.length; i += 1) {
    bits += BITS_IN_NIBBLE[parseInt(a[i], 16) ^ parseInt(b[i], 16)];
  }
  return bits;
}

// Words every product shares, or that only describe the file - matching on
// them would make every card look like every other.
const NOISE = new Set([
  "handmade", "card", "cards", "the", "and", "with", "for", "of", "a", "in",
  "jpg", "jpeg", "png", "heic", "image", "pasted", "copy", "white", "cream",
]);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((word) => word.length > 2 && !NOISE.has(word)),
  );
}

/** How many meaningful words a product's name shares with a sheet row's filename and note. */
export function nameAffinity(productName: string, rowWords: string): number {
  const mine = words(productName);
  let shared = 0;
  for (const word of words(rowWords)) if (mine.has(word)) shared += 1;
  return shared;
}

export interface MatchProduct {
  id: string;
  name: string;
  photoHashes: string[];
}

function nearest(hash: string, photoHashes: readonly string[]): number {
  return photoHashes.reduce((best, other) => Math.min(best, hammingDistance(hash, other)), Infinity);
}

/**
 * The product a sheet row is surely a photograph of, or null.
 *
 * Only a near-identical photo, and only when no other product comes close.
 * Anything less is left for a person, who can see what a hash cannot.
 */
export function confidentProductFor(
  entry: { photoHash: string | null },
  products: readonly MatchProduct[],
): string | null {
  if (!entry.photoHash) return null;

  const ranked = products
    .filter((product) => product.photoHashes.length > 0)
    .map((product) => ({ id: product.id, distance: nearest(entry.photoHash!, product.photoHashes) }))
    .sort((a, b) => a.distance - b.distance);

  const [best, runnerUp] = ranked;
  if (!best || best.distance > CONFIDENT_DISTANCE) return null;
  if (runnerUp && runnerUp.distance - best.distance < CLEAR_MARGIN) return null;

  return best.id;
}

export interface RankableEntry {
  id: string;
  photoHash: string | null;
  filename: string | null;
  note: string | null;
}

/**
 * The sheet rows most likely to be this product, best first.
 *
 * For choosing by eye: the ranking only has to put the right one near the
 * top, because Njomza is looking at the photograph and will know it.
 */
export function rankEntriesFor<T extends RankableEntry>(
  product: MatchProduct,
  entries: readonly T[],
  { limit = HOW_MANY }: { limit?: number } = {},
): T[] {
  const score = (entry: T) => {
    const distance =
      entry.photoHash && product.photoHashes.length > 0 ? nearest(entry.photoHash, product.photoHashes) : NO_PHOTO;
    const affinity = nameAffinity(product.name, `${entry.filename ?? ""} ${entry.note ?? ""}`);
    return distance - WORD_WEIGHT * affinity;
  };

  return [...entries]
    .map((entry) => ({ entry, score: score(entry) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ entry }) => entry);
}
