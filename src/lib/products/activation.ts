/**
 * Whether a product may be put on the shop, and if not, why.
 *
 * Prices are set on the pricing page, not the product form, so a new product
 * starts at nothing. Made active before it is priced, it would be on the shop
 * for free - so it cannot be, and the reason says where to go instead.
 */
export function activationBlockedBecause(product: { pricePence: number }): string | null {
  if (product.pricePence > 0) return null;
  return "Price it on the pricing page before putting it on the shop.";
}
