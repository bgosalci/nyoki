/**
 * A piece's reviews in a line: how many, and their average.
 *
 * The average is of every review on the shop, and kept in tenths of a star -
 * a whole number, so it rounds once, the same way every time.
 */

export interface RatingSummary {
  count: number;
  /** The average in tenths of a star (4.7 is 47); null with no reviews. */
  tenths: number | null;
}

export function ratingSummary(ratings: readonly number[]): RatingSummary {
  if (ratings.length === 0) return { count: 0, tenths: null };
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return { count: ratings.length, tenths: Math.round((total * 10) / ratings.length) };
}

/** "4.7", or "5.0": always one place, as a shop's average is written. */
export function averageText(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

/** What a row of stars says to a screen reader: "Rated 4.7 out of 5", "Rated 3 out of 5". */
export function ratingLabel(tenths: number): string {
  return `Rated ${tenths % 10 === 0 ? tenths / 10 : averageText(tenths)} out of 5`;
}

export function reviewCount(count: number): string {
  return `${count} review${count === 1 ? "" : "s"}`;
}
