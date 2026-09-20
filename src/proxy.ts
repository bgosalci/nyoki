import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const LOGIN_PATH = "/admin/login";

/**
 * Optimistic auth redirect for the CMS.
 *
 * This only reads and verifies the cookie - never the database - because a
 * proxy runs on every matched request including prefetches. It is a
 * convenience so signed-out visitors land on the login form; the real guard is
 * `requireAdmin()` in the protected layout.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === LOGIN_PATH;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;

  // A missing secret is a deployment error, but throwing here would 500 every
  // admin request. Treat it as "not signed in" and let the login action raise
  // the real error where someone will see it.
  const session =
    token && secret ? await verifySessionToken(token, secret) : null;

  if (!session && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  if (session && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Scoped to the CMS only. A catch-all matcher with negative lookaheads runs
  // on asset requests too and breaks their paths, so the storefront is left
  // entirely alone here.
  matcher: ["/admin/:path*"],
};
