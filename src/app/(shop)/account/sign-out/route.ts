import { redirect } from "next/navigation";

import { currentCustomer } from "@/lib/account/dal";
import { destroyCustomerSession } from "@/lib/account/session-cookie";
import { cameFromElsewhere } from "@/lib/auth/elsewhere";

/**
 * Signing out is a route handler rather than an action on a page: cookies
 * cannot be cleared while a page renders, and a page that wanted to sign
 * somebody out would bounce off its own still-valid cookie.
 *
 * A live session is ended only from the shop's own pages (or an address
 * typed in): any other website could otherwise link here and sign shoppers
 * out at will. A dead one is always cleared, wherever the request came from -
 * the guard sends it here, and kept, it would come straight back. GET only:
 * the shop signs out by a link, and a form posted from elsewhere is no way in.
 */
export async function GET() {
  if ((await cameFromElsewhere()) && (await currentCustomer())) redirect("/account");

  await destroyCustomerSession();
  redirect("/");
}
