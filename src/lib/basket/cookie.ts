import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * What a guest's basket cookie holds: the basket's id and a signature over
 * it, made with the shop's secret.
 *
 * Whoever holds a basket's id holds the basket, and the order waiting for it -
 * checkout fills its form from that order's email, phone and address. An id
 * is a cuid (a timestamp, a counter and a little randomness), made to be
 * unique, never to be secret; signed, a guessed or altered one opens nothing.
 */

function signatureOf(id: string, secret: string): string {
  return createHmac("sha256", secret).update(`basket:${id}`).digest("base64url");
}

export function signBasketId(id: string, secret: string): string {
  return `${id}.${signatureOf(id, secret)}`;
}

/** The basket a cookie names, or null for one not signed by this shop - an unsigned id included. */
export function basketIdFrom(value: string, secret: string): string | null {
  const [id, signature, ...rest] = value.split(".");
  if (!id || !signature || rest.length > 0) return null;

  const expected = Buffer.from(signatureOf(id, secret));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}
