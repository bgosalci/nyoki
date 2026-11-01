/**
 * @jest-environment node
 */
const authenticateAdmin = jest.fn();
const startSession = jest.fn();
const update = jest.fn();
const attempt = jest.fn();
const forget = jest.fn();
const isKnownBrowser = jest.fn();
const rememberBrowser = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({ db: { adminUser: { findUnique: jest.fn(), update: (args: unknown) => update(args) } } }));
jest.mock("../src/lib/auth/authenticate", () => ({
  ...jest.requireActual("../src/lib/auth/authenticate"),
  authenticateAdmin: (...args: unknown[]) => authenticateAdmin(...args),
}));
jest.mock("../src/lib/auth/session-cookie", () => ({ startSession: (...args: unknown[]) => startSession(...args) }));
jest.mock("../src/lib/auth/known-browser", () => ({
  isKnownBrowser: (...args: unknown[]) => isKnownBrowser(...args),
  rememberBrowser: (...args: unknown[]) => rememberBrowser(...args),
}));
jest.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
jest.mock("../src/lib/rate-limit", () => ({
  ...jest.requireActual("../src/lib/rate-limit"),
  attempt: (...args: unknown[]) => attempt(...args),
  requestAddress: async () => "address-hash",
}));

import { login } from "@/app/admin/login/actions";
import { ADMIN_SIGN_IN_PER_ADDRESS, ADMIN_SIGN_IN_PER_EMAIL, WAIT_A_WHILE, emailKey } from "@/lib/rate-limit";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const tried = form({ email: " Njomza@Nyoki.co.uk ", password: "a wrong password" });
const owner = { userId: "a1", email: "njomza@nyoki.co.uk", role: "OWNER" };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.AUTH_SECRET = "test-secret-at-least-32-bytes-long-for-hs256";
  attempt.mockResolvedValue({ over: false, forget });
  isKnownBrowser.mockResolvedValue(false);
  authenticateAdmin.mockResolvedValue(null);
});

describe("login's limit on failed attempts", () => {
  it("counts an attempt against the address it came from and a hash of the email it tried", async () => {
    const result = await login({ error: null, email: "" }, tried);

    expect(result).toEqual({ error: "Those details are not right. Please try again.", email: " Njomza@Nyoki.co.uk " });
    expect(attempt).toHaveBeenCalledWith(ADMIN_SIGN_IN_PER_ADDRESS, "address-hash");
    expect(attempt).toHaveBeenCalledWith(ADMIN_SIGN_IN_PER_EMAIL, emailKey("njomza@nyoki.co.uk"));
    // A failure stays counted.
    expect(forget).not.toHaveBeenCalled();
  });

  it.each([
    ["the address", ADMIN_SIGN_IN_PER_ADDRESS],
    ["the email", ADMIN_SIGN_IN_PER_EMAIL],
  ])("asks for a wait once %s has had too many, without checking the password", async (_, reached) => {
    attempt.mockImplementation(async (limit) => ({ over: limit === reached, forget }));

    const result = await login({ error: null, email: "" }, tried);

    expect(result).toEqual({ error: WAIT_A_WHILE, email: " Njomza@Nyoki.co.uk " });
    // Checking costs a deliberately slow hash; a script is refused before it.
    expect(authenticateAdmin).not.toHaveBeenCalled();
  });

  it("takes a sign-in that works back off the counts, and knows the browser from then on", async () => {
    authenticateAdmin.mockResolvedValue(owner);

    await expect(login({ error: null, email: "" }, tried)).rejects.toThrow("NEXT_REDIRECT /admin");
    expect(forget).toHaveBeenCalledTimes(2);
    expect(startSession).toHaveBeenCalledWith(owner);
    expect(rememberBrowser).toHaveBeenCalledWith("admin", "njomza@nyoki.co.uk");
  });

  // Counted from anywhere, the email's limit let a stranger keep Njomza out
  // by failing twenty times an hour. Her own browser is let past it.
  it("lets a browser that has signed in to the account past the email's limit, not the address's", async () => {
    isKnownBrowser.mockResolvedValue(true);
    attempt.mockImplementation(async (limit) => ({ over: limit === ADMIN_SIGN_IN_PER_EMAIL, forget }));
    authenticateAdmin.mockResolvedValue(owner);

    await expect(login({ error: null, email: "" }, tried)).rejects.toThrow("NEXT_REDIRECT /admin");
    expect(isKnownBrowser).toHaveBeenCalledWith("admin", "njomza@nyoki.co.uk");
    expect(attempt).not.toHaveBeenCalledWith(ADMIN_SIGN_IN_PER_EMAIL, expect.anything());

    jest.clearAllMocks();
    attempt.mockImplementation(async (limit) => ({ over: limit === ADMIN_SIGN_IN_PER_ADDRESS, forget }));
    isKnownBrowser.mockResolvedValue(true);
    await expect(login({ error: null, email: "" }, tried)).resolves.toEqual({ error: WAIT_A_WHILE, email: " Njomza@Nyoki.co.uk " });
  });
});
