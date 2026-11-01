/**
 * Where signing in goes on to. Checkout and the basket ask for it with
 * `?next=`, and come back to where the shopper was, as a piece's reviews do
 * to its page; anything else goes to the account. Named places only, never
 * whatever the link says, so a link cannot send a shopper who has just
 * signed in somewhere else.
 */
const RETURNS = new Set(["/checkout", "/basket"]);

/**
 * A piece's page, by an address of letters, digits, - and _ (Shopify's own
 * addresses can hold an _), and perhaps its reviews: no slash, dot or colon
 * that could lead anywhere else.
 */
const PIECE = /^\/product\/[A-Za-z0-9_-]+(#reviews)?$/;

export function afterSignIn(next: string | null | undefined): string {
  return next && (RETURNS.has(next) || PIECE.test(next)) ? next : "/account";
}
