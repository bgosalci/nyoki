import "server-only";

import { redirect } from "next/navigation";

import { readSession } from "@/lib/auth/session-cookie";
import type { SessionPayload } from "@/lib/auth/session";
import { db } from "@/lib/db";

/**
 * The signed-in admin for the current request, or a redirect.
 *
 * The cookie proves who signed in; the database says whether they still may
 * and as what. Reading the role live means a promotion applies on the next
 * request rather than the next sign-in, and a removed account stops working
 * at once instead of when its cookie expires. Every protected page and action
 * calls this. The proxy's redirect only reads the cookie and is a convenience,
 * never the guard.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) redirect("/admin/login");

  const admin = await db.adminUser.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true },
  });

  // Cookies cannot be cleared while a page renders; the sign-out route can,
  // and going straight to login would bounce back here on the still-valid
  // cookie.
  if (!admin) redirect("/admin/sign-out");

  return { userId: admin.id, email: admin.email, role: admin.role };
}

/** For pages that vary by role rather than simply requiring a login. */
export async function requireOwner(): Promise<SessionPayload> {
  const session = await requireAdmin();
  if (session.role !== "OWNER") redirect("/admin");
  return session;
}
