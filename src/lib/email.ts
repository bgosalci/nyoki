/**
 * Whether something typed into an email box looks like an address.
 *
 * Deliberately loose - something@something.something - since the point is to
 * catch a name typed into the wrong box, not to prove an address can receive
 * mail. Every form that asks for an email (registering, a shopper's details,
 * checkout, Ask a question, a CMS account) checks it here.
 */

/** The longest address mail can carry (RFC 5321's 256-byte path, less its angle brackets). */
export const EMAIL_MAX = 254;

// Characters an address never needs that a link would read as something else.
// An address is pasted into the admin's "Reply by email" mailto: link, where
// ? and & would start a query (?cc=someone, &body=...), % would escape one, and
// , or ; would list a second recipient. Quotes and angle brackets are kept out
// with them.
const NOT_IN_AN_ADDRESS = String.raw`\s@"<>(),;:?&%\\`;

/**
 * A domain's labels can never hold a dot, so there is only one way to split
 * one into labels, and the pattern matches in a single pass. The pattern this
 * replaced, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, could split a run of dots between
 * its last two parts in every possible way: 80,000 dots took three seconds
 * through the Contact form, four times as long for every doubling, on a form
 * anyone can post eleven megabytes to.
 */
export const EMAIL_PATTERN = new RegExp(
  `^[^${NOT_IN_AN_ADDRESS}]+@[^${NOT_IN_AN_ADDRESS}.]+(?:\\.[^${NOT_IN_AN_ADDRESS}.]+)+$`,
);

/** Checked for length first, so nothing longer than an address is ever matched at all. */
export function looksLikeEmail(value: string): boolean {
  return value.length <= EMAIL_MAX && EMAIL_PATTERN.test(value);
}
