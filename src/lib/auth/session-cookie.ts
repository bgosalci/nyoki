import "server-only";

import { cookies } from "next/headers";

import { authSecret } from "@/lib/auth/secret";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
  type VerifiedSession,
} from "@/lib/auth/session";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/** Issue a session cookie for a signed-in admin. */
export async function startSession(session: SessionPayload): Promise<void> {
  const token = await createSessionToken(session, authSecret());
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, // not readable from JavaScript, so XSS cannot steal it
    // Cookies marked secure are not sent over plain http, which would break
    // local development on http://localhost.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // survives following a link in, blocks cross-site POSTs
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

/** The current admin session, or null if not signed in. */
export async function readSession(): Promise<VerifiedSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  return verifySessionToken(token, authSecret());
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
