/**
 * Where signing in goes on to. Checkout and the basket ask for it with
 * `?next=`, and come back to where the shopper was; anything else goes to
 * the account. Named places only, never whatever the link says, so a link
 * cannot send a shopper who has just signed in somewhere else.
 */
const RETURNS = new Set(["/checkout", "/basket"]);

export function afterSignIn(next: string | null | undefined): string {
  return next && RETURNS.has(next) ? next : "/account";
}
