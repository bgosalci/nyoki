import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth/session";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Read the signing secret, failing loudly if it is missing.
 *
 * Deliberately not defaulted: a fallback secret would let the CMS boot in
 * production with sessions anyone could forge.
 */
function requireSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.",
    );
  }

  return secret;
}

/** Issue a session cookie for a signed-in admin. */
export async function startSession(session: SessionPayload): Promise<void> {
  const token = await createSessionToken(session, requireSecret());
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
export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  return verifySessionToken(token, requireSecret());
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
