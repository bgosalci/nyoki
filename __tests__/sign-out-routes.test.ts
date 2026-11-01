/**
 * @jest-environment node
 */
const fetchSite = { current: null as string | null };
const currentAdmin = jest.fn();
const currentCustomer = jest.fn();
const destroySession = jest.fn();
const destroyCustomerSession = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => (name === "sec-fetch-site" ? fetchSite.current : null) }),
}));
jest.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
jest.mock("../src/lib/auth/dal", () => ({ currentAdmin: () => currentAdmin() }));
jest.mock("../src/lib/account/dal", () => ({ currentCustomer: () => currentCustomer() }));
jest.mock("../src/lib/auth/session-cookie", () => ({ destroySession: () => destroySession() }));
jest.mock("../src/lib/account/session-cookie", () => ({ destroyCustomerSession: () => destroyCustomerSession() }));

import { GET as adminSignOut } from "@/app/admin/sign-out/route";
import { GET as shopSignOut } from "@/app/(shop)/account/sign-out/route";
import * as shopRoute from "@/app/(shop)/account/sign-out/route";

beforeEach(() => {
  jest.clearAllMocks();
  fetchSite.current = null;
  currentAdmin.mockResolvedValue({ userId: "a1", email: "njomza@nyoki.co.uk", role: "OWNER" });
  currentCustomer.mockResolvedValue({ id: "c1", email: "ada@example.com", name: "Ada" });
});

describe.each([
  ["the CMS's", adminSignOut, destroySession, currentAdmin, "/admin/login", "/admin"],
  ["the shop's", shopSignOut, destroyCustomerSession, currentCustomer, "/", "/account"],
])("%s sign-out", (_, signOut, destroy, current, signedOutTo, keptTo) => {
  it.each(["same-origin", "none"])("signs out from the shop's own pages, or an address typed in (%s)", async (site) => {
    fetchSite.current = site;

    await expect(signOut()).rejects.toThrow(`NEXT_REDIRECT ${signedOutTo}`);
    expect(destroy).toHaveBeenCalled();
  });

  it("signs out a browser that does not say where a request came from", async () => {
    await expect(signOut()).rejects.toThrow(`NEXT_REDIRECT ${signedOutTo}`);
    expect(destroy).toHaveBeenCalled();
  });

  // Any other website could link or redirect here, and sign the shop's
  // visitors out at will.
  it.each(["cross-site", "same-site"])("keeps a live session signed in when the request came from elsewhere (%s)", async (site) => {
    fetchSite.current = site;

    await expect(signOut()).rejects.toThrow(`NEXT_REDIRECT ${keptTo}`);
    expect(destroy).not.toHaveBeenCalled();
  });

  // A dead session is sent here to be cleared - from a page reached by a
  // link from elsewhere too - and keeping it would send it round in a loop.
  it("always clears a session that no longer opens anything", async () => {
    fetchSite.current = "cross-site";
    current.mockResolvedValue(null);

    await expect(signOut()).rejects.toThrow(`NEXT_REDIRECT ${signedOutTo}`);
    expect(destroy).toHaveBeenCalled();
  });
});

it("no longer answers a POST from anywhere for the shop: signing out is a link", () => {
  expect("POST" in shopRoute).toBe(false);
});
