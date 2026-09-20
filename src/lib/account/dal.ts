import "server-only";

import { redirect } from "next/navigation";

import { readCustomerSession } from "@/lib/account/session-cookie";
import { db } from "@/lib/db";

export interface Shopper {
  id: string;
  email: string;
  name: string | null;
}

/**
 * The signed-in shopper for this request, or null.
 *
 * The cookie proves who signed in; the database says whether they still may.
 * Reading it live means a name changed on the account page shows at once
 * rather than in thirty days' time, and an account that has been closed stops
 * working immediately instead of when its cookie runs out.
 */
export async function currentCustomer(): Promise<Shopper | null> {
  const session = await readCustomerSession();
  if (!session) return null;

  const customer = await db.customer.findUnique({
    where: { id: session.customerId },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  // No hash means the account has been closed back down to a guest record,
  // which is not something a session should still open.
  if (!customer?.passwordHash) return null;

  return { id: customer.id, email: customer.email, name: customer.name };
}

/** For the pages inside the account, which exist only for somebody signed in. */
export async function requireCustomer(): Promise<Shopper> {
  const session = await readCustomerSession();
  if (!session) redirect("/account/sign-in");

  const shopper = await currentCustomer();

  // Cookies cannot be cleared while a page renders; the sign-out route can,
  // and going straight to the form would bounce back here on the still-valid
  // cookie.
  if (!shopper) redirect("/account/sign-out");

  return shopper;
}
