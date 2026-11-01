import { ratingLabel } from "@/lib/reviews/summary";

/** A five-pointed star on a 24px grid. */
export const STAR_PATH = "M12 3.2 14.6 8.6 20.5 9.4 16.2 13.5 17.3 19.4 12 16.5 6.7 19.4 7.8 13.5 3.5 9.4 9.4 8.6 12 3.2Z";

/**
 * A row of five stars filled to a rating, a part star included: 4.7 fills
 * four and most of the fifth. One image to a screen reader, saying the
 * rating in words.
 *
 * Drawn in the colour of the text around it, so it reads wherever it is put:
 * on the shop's beige and in the admin, light or dark.
 */
export function Stars({ tenths, size = "size-4" }: { tenths: number; size?: string }) {
  const row = (fill: boolean) =>
    [0, 1, 2, 3, 4].map((index) => (
      <svg
        key={index}
        viewBox="0 0 24 24"
        fill={fill ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`${size} shrink-0`}
      >
        <path d={STAR_PATH} />
      </svg>
    ));

  return (
    <span role="img" aria-label={ratingLabel(tenths)} className="relative inline-flex shrink-0">
      <span className="flex">{row(false)}</span>
      {/* The filled row over the empty one, cut to the rating: five stars are 50 tenths. */}
      <span className="absolute inset-y-0 left-0 flex overflow-hidden" style={{ width: `${tenths * 2}%` }}>
        {row(true)}
      </span>
    </span>
  );
}
