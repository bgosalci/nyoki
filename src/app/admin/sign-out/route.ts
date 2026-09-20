import { redirect } from "next/navigation";

import { destroySession } from "@/lib/auth/session-cookie";

/**
 * Clears the session cookie and returns to the login page. A route handler
 * because cookies can be changed here but not while a page renders; the
 * layout sends a session whose account has gone to this address.
 */
export async function GET() {
  await destroySession();
  redirect("/admin/login");
}
