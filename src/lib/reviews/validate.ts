/**
 * A shopper's review, as the review form posts it, and the shop's reply to
 * one, as the admin posts it.
 *
 * Pure, so the rules are tested apart from the pages. Who wrote it is never
 * read from the form: a review is written signed in, and the account is the
 * session's.
 */

export const BODY_MAX = 2000;
export const NAME_MAX = 50;
export const REPLY_MAX = 2000;

/** The stars a review can give, fewest first. */
export const RATINGS = [1, 2, 3, 4, 5] as const;

export interface ReviewInput {
  productId: string;
  rating: number;
  body: string;
  name: string;
}

export type ReviewField = "rating" | "body" | "name";
export type ReviewErrors = Partial<Record<ReviewField, string>>;

export type ReviewValidation = { ok: true; data: ReviewInput } | { ok: false; errors: ReviewErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  // A textarea submits its line breaks as \r\n; keep plain \n.
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
}

export function parseReview(form: FormData): ReviewValidation {
  const errors: ReviewErrors = {};

  // Only the digits a radio sends: "4.5", "1e0" and " 4" are not a star.
  const stars = text(form, "rating");
  const rating = /^[1-5]$/.test(stars) ? Number(stars) : null;
  if (rating === null) errors.rating = "Please choose how many stars to give it.";

  const body = text(form, "body");
  if (body === "") errors.body = "Please write a few words about it.";
  else if (body.length > BODY_MAX) errors.body = `Please keep your review to ${BODY_MAX.toLocaleString("en-GB")} characters.`;

  const name = text(form, "name");
  if (name === "") errors.name = "Please give a name to show with your review.";
  else if (name.length > NAME_MAX) errors.name = `Please keep the name to ${NAME_MAX} characters.`;

  // Posted by the page itself; without it there is nothing to review.
  const productId = text(form, "productId");

  if (Object.keys(errors).length > 0 || rating === null || productId === "") return { ok: false, errors };
  return { ok: true, data: { productId, rating, body, name } };
}

/**
 * The name a review starts with: the first name and the last name's initial
 * ("Ada L."), since a review is public and the account's whole name need not
 * be. The shopper can change it.
 */
export function shownName(accountName: string | null): string {
  const words = (accountName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0];
  return `${words[0]} ${words[words.length - 1][0]}.`;
}

export type ReplyValidation = { ok: true; data: { id: string; reply: string | null } } | { ok: false; error: string };

/** The shop's reply beneath a review. Emptied, it takes the reply away. */
export function parseReply(form: FormData): ReplyValidation {
  const reply = text(form, "reply");
  if (reply.length > REPLY_MAX) return { ok: false, error: `Please keep the reply to ${REPLY_MAX.toLocaleString("en-GB")} characters.` };
  return { ok: true, data: { id: text(form, "id"), reply: reply === "" ? null : reply } };
}
