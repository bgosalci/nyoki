import "server-only";

import { redirect } from "next/navigation";

import { readSession } from "@/lib/auth/session-cookie";
import type { SessionPayload } from "@/lib/auth/session";

/**
 * The session for the current request, or a redirect to the login page.
 *
 * Every protected page and action calls this. The proxy also redirects
 * unauthenticated visitors, but that check is optimistic - it only reads the
 * cookie and can be bypassed, so it is a convenience, never the real guard.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await readSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

/** For pages that vary by role rather than simply requiring a login. */
export async function requireOwner(): Promise<SessionPayload> {
  const session = await requireAdmin();

  if (session.role !== "OWNER") {
    redirect("/admin");
  }

  return session;
}
