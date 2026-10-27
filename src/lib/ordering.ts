/**
 * Whether shoppers can order: the basket, checkout and Add to basket.
 *
 * Open while developing and closed on the live site, because payment is not
 * built yet and a shopper would reach Ready to pay with no way to pay. Set
 * ORDERING to "open" or "closed" to say otherwise; payment switches it on.
 * Closed, the shop reads as it always has - "online ordering opens soon".
 */
export function orderingOpen(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  if (env.ORDERING === "open") return true;
  // Anything else set is a mistake, and taking orders by mistake is worse.
  if (env.ORDERING) return false;
  return env.NODE_ENV !== "production";
}
