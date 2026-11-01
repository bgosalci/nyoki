import type { OrderStatus } from "@/lib/orders/status";

/**
 * Whether a review comes from someone who bought the piece from the shop -
 * what "Verified purchase" says beside it.
 *
 * Bought means paid for: sent, waiting to be sent, or refunded since. A
 * refund does not undo having had the piece, and one sent back as faulty is
 * exactly what a review should be able to say. An order never paid for, or
 * cancelled, bought nothing.
 */
export const BOUGHT: readonly OrderStatus[] = ["PAID", "FULFILLED", "REFUNDED"];

/**
 * The order lines that show a shopper bought a piece: in an order placed
 * signed in to their own account. A guest order is joined to whichever
 * account holds its email, and nothing yet proves an email belongs to
 * whoever registered it, so a guest order proves nothing about the account
 * - as `shopperOrders` leaves them out of the account's own list.
 */
export function purchaseOf(customerId: string, productId: string) {
  return { productId, order: { customerId, signedIn: true, status: { in: [...BOUGHT] } } };
}
