import { redirect } from "next/navigation";

import { currentAdmin } from "@/lib/auth/dal";
import { cameFromElsewhere } from "@/lib/auth/elsewhere";
import { destroySession } from "@/lib/auth/session-cookie";

/**
 * Clears the session cookie and returns to the login page. A route handler
 * because cookies can be changed here but not while a page renders; the
 * guard sends a session whose account has gone to this address.
 *
 * A live session is ended only from the shop's own pages (or an address
 * typed in): any other website could otherwise link here and sign Njomza out
 * at will. A dead one is always cleared, wherever the request came from -
 * kept, it would be sent straight back here.
 */
export async function GET() {
  if ((await cameFromElsewhere()) && (await currentAdmin())) redirect("/admin");

  await destroySession();
  redirect("/admin/login");
}
