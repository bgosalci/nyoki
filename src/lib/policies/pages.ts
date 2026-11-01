/**
 * The shop's policies: one list, so the footer, checkout's footer, the
 * policies page and each policy's "other policies" all name the same pages
 * in the same order. The order is the order a shopper needs them in.
 */

export interface Policy {
  slug: string;
  title: string;
  /** The footer of checkout, where room is short. */
  short: string;
  summary: string;
}

/** When the policies were last changed. Change it with them. */
export const POLICIES_UPDATED = "1 November 2026";

export const POLICIES: readonly Policy[] = [
  {
    slug: "delivery",
    title: "Delivery",
    short: "Delivery",
    summary: "Where we send to, how long it takes, what it costs, and what happens if a parcel goes astray.",
  },
  {
    slug: "returns",
    title: "Returns and refunds",
    short: "Returns",
    summary: "Changing your mind, personalised pieces, faults, and how and when you are refunded.",
  },
  {
    slug: "terms",
    title: "Terms and conditions",
    short: "Terms",
    summary: "The agreement between us when you order: prices, handmade pieces, personalisation and your rights.",
  },
  {
    slug: "privacy",
    title: "Privacy notice",
    short: "Privacy",
    summary: "What we know about you, why, who helps us, how long we keep it and your rights.",
  },
  {
    slug: "cookies",
    title: "Cookies",
    short: "Cookies",
    summary: "The two small cookies the shop needs to work, and why there is no cookie banner.",
  },
];

export function policyHref(policy: Pick<Policy, "slug">): string {
  return `/policies/${policy.slug}`;
}
