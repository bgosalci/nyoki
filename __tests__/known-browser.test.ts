/**
 * @jest-environment node
 */
const jar = new Map<string, string>();
const set = jest.fn((name: string, value: string, _options?: unknown) => jar.set(name, value));

// jest.mock() does not go through the @/ alias, so this is relative.
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string, options: unknown) => set(name, value, options),
  }),
}));

import { KNOWN_BROWSER_COOKIE, KNOWN_BROWSER_DAYS } from "@/lib/account/cookie";
import { ADMIN_KNOWN_BROWSER_COOKIE, isKnownBrowser, rememberBrowser } from "@/lib/auth/known-browser";

beforeEach(() => {
  jest.clearAllMocks();
  jar.clear();
  process.env.AUTH_SECRET = "test-secret-at-least-32-bytes-long-for-hs256";
});

/**
 * A browser that has signed in to an account is let past the limit on that
 * account's email: counted from anywhere, it let a stranger lock Njomza out
 * of the CMS by failing twenty times an hour.
 */
describe("a known browser", () => {
  it("is one that signed in to the account before", async () => {
    await rememberBrowser("admin", "njomza@nyoki.co.uk");

    await expect(isKnownBrowser("admin", "njomza@nyoki.co.uk")).resolves.toBe(true);
  });

  it("is known for that account only", async () => {
    await rememberBrowser("admin", "njomza@nyoki.co.uk");

    await expect(isKnownBrowser("admin", "burim@nyoki.co.uk")).resolves.toBe(false);
  });

  it("is known to the CMS and the shop apart", async () => {
    await rememberBrowser("shopper", "ada@example.com");

    await expect(isKnownBrowser("admin", "ada@example.com")).resolves.toBe(false);
    await expect(isKnownBrowser("shopper", "ada@example.com")).resolves.toBe(true);
  });

  it("is not a browser with no mark, or one it could have made up", async () => {
    await expect(isKnownBrowser("shopper", "ada@example.com")).resolves.toBe(false);

    jar.set(KNOWN_BROWSER_COOKIE, "made-up");
    await expect(isKnownBrowser("shopper", "ada@example.com")).resolves.toBe(false);
  });

  it("is remembered in an httpOnly cookie for a year, under the shop's and the CMS's own names", async () => {
    await rememberBrowser("shopper", "ada@example.com");
    await rememberBrowser("admin", "njomza@nyoki.co.uk");

    expect(set).toHaveBeenCalledWith(KNOWN_BROWSER_COOKIE, expect.any(String), expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }));
    expect(set).toHaveBeenCalledWith(ADMIN_KNOWN_BROWSER_COOKIE, expect.any(String), expect.objectContaining({ httpOnly: true }));
    expect(KNOWN_BROWSER_DAYS).toBe(365);
  });

  it("does not carry the email in the cookie", async () => {
    await rememberBrowser("shopper", "ada@example.com");

    expect(jar.get(KNOWN_BROWSER_COOKIE)).not.toContain("ada");
  });
});
