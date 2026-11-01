import { PlainText } from "@/components/shop/plain-text";
import { Stars } from "@/components/stars";
import { ui } from "@/lib/brand/ui";
import { formatOrderDate } from "@/lib/orders/status";
import { BUSINESS } from "@/lib/policies/business";
import { averageText, ratingLabel, reviewCount } from "@/lib/reviews/summary";

/** A published review, as the shop shows it: never who wrote it beyond the name they chose, nor the order behind it. */
export interface ShopReview {
  id: string;
  name: string;
  rating: number;
  body: string;
  /** Bought from the shop, signed in to the account that wrote it. */
  verified: boolean;
  submittedAt: Date;
  reply: string | null;
}

/** "Verified purchase", beside a review from someone who bought the piece here. */
export function VerifiedBadge() {
  return <span className={`px-2 py-0.5 text-xs tracking-wider uppercase ${ui.shopBadge}`}>Verified purchase</span>;
}

/** The shop's reply beneath a review, marked as the shop's. */
export function ShopReply({ id, text }: { id: string; text: string }) {
  const headingId = `reply-${id}`;
  return (
    <section aria-labelledby={headingId} className={`mt-4 border-l-2 pl-4 ${ui.shopRule}`}>
      <h4 id={headingId} className={`text-xs font-medium tracking-[0.1em] uppercase ${ui.shopAccent}`}>
        Reply from {BUSINESS.tradingName}
      </h4>
      <PlainText text={text} className={`mt-1.5 text-sm leading-relaxed ${ui.shopMuted}`} />
    </section>
  );
}

/** A piece's published reviews, newest first, each with its stars, who and when, the words, and the shop's reply. */
export function ReviewList({ reviews }: { reviews: ShopReview[] }) {
  return (
    <ul className="flex flex-col">
      {reviews.map((review) => {
        const nameId = `review-${review.id}`;
        return (
          <li key={review.id} className={`border-t py-6 first:border-t-0 first:pt-0 ${ui.shopRule}`}>
            <article aria-labelledby={nameId}>
              <div className="flex flex-wrap items-center gap-3">
                <Stars tenths={review.rating * 10} />
                {review.verified ? <VerifiedBadge /> : null}
              </div>
              <p className={`mt-2 text-sm ${ui.shopMuted}`}>
                <span id={nameId} className="font-medium text-nyoki-navy">
                  {review.name}
                </span>
                {" · "}
                <time dateTime={review.submittedAt.toISOString()}>{formatOrderDate(review.submittedAt)}</time>
              </p>
              <PlainText text={review.body} className="mt-3 text-sm leading-relaxed" />
              {review.reply ? <ShopReply id={review.id} text={review.reply} /> : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/** The average of every review on the shop, in stars and figures, and how many there are. */
export function ReviewsSummary({ count, tenths }: { count: number; tenths: number | null }) {
  if (count === 0 || tenths === null) return <p className={`text-sm ${ui.shopMuted}`}>No reviews yet.</p>;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className={`text-3xl tabular-nums ${ui.shopHeading}`}>{averageText(tenths)}</span>
      <Stars tenths={tenths} size="size-5" />
      <span className={`text-sm ${ui.shopMuted}`}>{reviewCount(count)}</span>
    </div>
  );
}

/** Beneath a piece's name: its stars and how many reviews, leading down to them. Nothing with none. */
export function RatingLink({ count, tenths }: { count: number; tenths: number | null }) {
  if (count === 0 || tenths === null) return null;

  return (
    <a
      href="#reviews"
      aria-label={`${ratingLabel(tenths)}, ${reviewCount(count)}`}
      className={`flex items-center gap-2 self-start text-sm hover:underline hover:underline-offset-4 ${ui.shopMuted}`}
    >
      <Stars tenths={tenths} />
      <span aria-hidden="true" className="tabular-nums">
        {averageText(tenths)} ({count})
      </span>
    </a>
  );
}
