import { redirect } from "next/navigation";

import { destroyCustomerSession } from "@/lib/account/session-cookie";

/**
 * Signing out is a route handler rather than an action on a page: cookies
 * cannot be cleared while a page renders, and a page that wanted to sign
 * somebody out would bounce off its own still-valid cookie.
 */
export async function GET() {
  await destroyCustomerSession();
  redirect("/");
}

export const POST = GET;
