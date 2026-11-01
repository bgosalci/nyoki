import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { readSession } from "@/lib/auth/session-cookie";
import { signedBefore, type SessionPayload, type VerifiedSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

/**
 * The signed-in admin for the current request, or a redirect.
 *
 * The cookie proves who signed in; the database says whether they still may
 * and as what. Reading the role live means a promotion applies on the next
 * request rather than the next sign-in, and a removed account stops working
 * at once instead of when its cookie expires. Every protected page, layout,
 * route and action calls this itself (a test holds them to it): moving between
 * admin pages renders only the page, so the protected layout's call alone
 * left every page open to a cookie whose account had gone. The proxy's
 * redirect only reads the cookie and is a convenience, never the guard.
 *
 * Remembered for the rest of a render, so a page and the layouts around it
 * look the account up once between them. Actions and routes are not renders,
 * and look it up every time.
 */
export const requireAdmin = cache(async (): Promise<SessionPayload> => {
  const session = await readSession();
  if (!session) redirect("/admin/login");

  const admin = await adminFor(session);

  // Cookies cannot be cleared while a page renders; the sign-out route can,
  // and going straight to login would bounce back here on the still-valid
  // cookie.
  if (!admin) redirect("/admin/sign-out");

  return admin;
});

/**
 * The admin whose session this is, or null: no session, an account removed
 * since, or a session signed before the account's password last changed or
 * was reset - which is what a change of password is for.
 */
export async function currentAdmin(): Promise<SessionPayload | null> {
  const session = await readSession();
  return session ? adminFor(session) : null;
}

/** The live account behind a session already read, or null. */
async function adminFor(session: VerifiedSession): Promise<SessionPayload | null> {
  const admin = await db.adminUser.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, sessionsValidFrom: true },
  });

  if (!admin || signedBefore(session.issuedAt, admin.sessionsValidFrom ?? null)) return null;

  return { userId: admin.id, email: admin.email, role: admin.role };
}

/** For pages that vary by role rather than simply requiring a login. */
export async function requireOwner(): Promise<SessionPayload> {
  const session = await requireAdmin();
  if (session.role !== "OWNER") redirect("/admin");
  return session;
}
