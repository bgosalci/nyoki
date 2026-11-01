import "server-only";

import { cookies } from "next/headers";

import { authSecret } from "@/lib/auth/secret";
import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_DAYS,
  createCustomerToken,
  verifyCustomerToken,
  type CustomerSession,
  type VerifiedCustomerSession,
} from "@/lib/account/session";

const SESSION_DURATION_MS = CUSTOMER_SESSION_DAYS * 24 * 60 * 60 * 1000;

export async function startCustomerSession(session: CustomerSession): Promise<void> {
  const token = await createCustomerToken(session, authSecret());
  const cookieStore = await cookies();

  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true, // not readable from JavaScript, so XSS cannot steal it
    // Cookies marked secure are not sent over plain http, which would break
    // local development on http://localhost.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // survives following a link in, blocks cross-site POSTs
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

export async function readCustomerSession(): Promise<VerifiedCustomerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (!token) return null;

  return verifyCustomerToken(token, authSecret());
}

export async function destroyCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}
