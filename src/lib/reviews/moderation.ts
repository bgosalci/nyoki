/**
 * What becomes of a review once it is written: read, then published or kept
 * off the shop - and, once published, taken off again if it has to be.
 *
 * A review is kept off only for one of these reasons, each named in the
 * reviews policy (/policies/reviews). The DMCC Act 2024 forbids publishing
 * reviews in a way that misleads, and leaving out the unfavourable ones is
 * exactly that; a fixed list of reasons, none of them about the stars or the
 * opinion, is what keeps the shop on the right side of it.
 */

export const REVIEW_STATUSES = ["PENDING", "PUBLISHED", "HIDDEN"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const HIDDEN_REASONS = [
  { value: "OFFENSIVE", label: "Offensive or abusive", says: "is offensive, abusive or unlawful" },
  { value: "PERSONAL_DETAILS", label: "Gives personal details", says: "gives someone's personal details" },
  { value: "ADVERTISING", label: "Advertising or spam", says: "advertises something or links elsewhere" },
  { value: "NOT_GENUINE", label: "Not a genuine review", says: "is not a genuine review of this piece" },
] as const;

export type HiddenReason = (typeof HIDDEN_REASONS)[number]["value"];

/** One of the reasons, from a request; anything else is none. */
export function parseHiddenReason(value: unknown): HiddenReason | null {
  return HIDDEN_REASONS.find((reason) => reason.value === value)?.value ?? null;
}

export function hiddenReasonLabel(reason: HiddenReason): string {
  return HIDDEN_REASONS.find((each) => each.value === reason)!.label;
}

/** Told to the shopper whose review it is, on the piece's page. */
export function hiddenBecause(reason: HiddenReason | null): string {
  const says = HIDDEN_REASONS.find((each) => each.value === reason)?.says;
  return says ? `We have not published your review, because it ${says}.` : "We have not published your review.";
}

const LABELS: Record<ReviewStatus, string> = {
  PENDING: "Waiting",
  PUBLISHED: "Published",
  HIDDEN: "Not published",
};

/** How a review's status reads in the admin: what is left to do. */
export function reviewStatusLabel(status: ReviewStatus): string {
  return LABELS[status];
}

/** Where a shopper's own review stands, said to them. */
export function shopperStatus(review: { status: ReviewStatus; hiddenReason: HiddenReason | null }): string {
  if (review.status === "PENDING") return "Waiting to be read. We read every review before it goes on the shop.";
  if (review.status === "PUBLISHED") return "On the shop.";
  return hiddenBecause(review.hiddenReason);
}
