import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { KNOWN_BROWSER_COOKIE, KNOWN_BROWSER_DAYS } from "@/lib/account/cookie";
import { authSecret } from "@/lib/auth/secret";

/**
 * A browser that has signed in to an account before, for the sign-in limits.
 *
 * Failed sign-ins are limited against an email from anywhere, which slows a
 * guesser spread across many addresses - and, counted from anywhere, let a
 * stranger lock Njomza out of the CMS by failing twenty times an hour. A
 * browser she has signed in from carries a mark for her email, and is let
 * past that limit; the limit on its own address still holds. The mark is a
 * keyed hash of the account's email: nothing to read, and nothing anyone
 * without the shop's secret could make.
 */

export type Who = "admin" | "shopper";

/** The CMS's is its own, and not on the shop's cookies page: it is set only for the team. */
export const ADMIN_KNOWN_BROWSER_COOKIE = "nyoki_admin_known_browser";

const COOKIE: Record<Who, string> = { admin: ADMIN_KNOWN_BROWSER_COOKIE, shopper: KNOWN_BROWSER_COOKIE };

function markFor(who: Who, email: string): string {
  return createHmac("sha256", authSecret()).update(`known-browser:${who}:${email}`).digest("base64url");
}

/** After a sign-in that worked: this browser is known for this email. Expects the email normalised. */
export async function rememberBrowser(who: Who, email: string): Promise<void> {
  (await cookies()).set(COOKIE[who], markFor(who, email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + KNOWN_BROWSER_DAYS * 24 * 60 * 60 * 1000),
  });
}

export async function isKnownBrowser(who: Who, email: string): Promise<boolean> {
  const value = (await cookies()).get(COOKIE[who])?.value;
  if (!value) return false;

  const expected = Buffer.from(markFor(who, email));
  const given = Buffer.from(value);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
