import "server-only";

import { cookies } from "next/headers";

import {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_DAYS,
  createCustomerToken,
  verifyCustomerToken,
  type CustomerSession,
} from "@/lib/account/session";

const SESSION_DURATION_MS = CUSTOMER_SESSION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Read the signing secret, failing loudly if it is missing.
 *
 * Deliberately not defaulted: a fallback secret would let the shop boot in
 * production with sessions anyone could forge.
 */
function requireSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.");
  }

  return secret;
}

export async function startCustomerSession(session: CustomerSession): Promise<void> {
  const token = await createCustomerToken(session, requireSecret());
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

export async function readCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (!token) return null;

  return verifyCustomerToken(token, requireSecret());
}

export async function destroyCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}
