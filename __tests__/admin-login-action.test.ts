/**
 * @jest-environment node
 */
const authenticateAdmin = jest.fn();
const startSession = jest.fn();
const update = jest.fn();
const isLimited = jest.fn();
const recordAttempt = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({ db: { adminUser: { findUnique: jest.fn(), update: (args: unknown) => update(args) } } }));
jest.mock("../src/lib/auth/authenticate", () => ({
  ...jest.requireActual("../src/lib/auth/authenticate"),
  authenticateAdmin: (...args: unknown[]) => authenticateAdmin(...args),
}));
jest.mock("../src/lib/auth/session-cookie", () => ({ startSession: (...args: unknown[]) => startSession(...args) }));
jest.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
jest.mock("../src/lib/rate-limit", () => ({
  ...jest.requireActual("../src/lib/rate-limit"),
  isLimited: (...args: unknown[]) => isLimited(...args),
  recordAttempt: (...args: unknown[]) => recordAttempt(...args),
  requestAddress: async () => "address-hash",
}));

import { login } from "@/app/admin/login/actions";
import { ADMIN_SIGN_IN_PER_ADDRESS, ADMIN_SIGN_IN_PER_EMAIL, WAIT_A_WHILE } from "@/lib/rate-limit";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const tried = form({ email: " Njomza@Nyoki.co.uk ", password: "a wrong password" });

beforeEach(() => {
  jest.clearAllMocks();
  isLimited.mockResolvedValue(false);
  authenticateAdmin.mockResolvedValue(null);
});

describe("login's limit on failed attempts", () => {
  it("counts a failure against the address it came from and the email it tried", async () => {
    const result = await login({ error: null, email: "" }, tried);

    expect(result).toEqual({ error: "Those details are not right. Please try again.", email: " Njomza@Nyoki.co.uk " });
    expect(recordAttempt).toHaveBeenCalledWith(ADMIN_SIGN_IN_PER_ADDRESS, "address-hash");
    expect(recordAttempt).toHaveBeenCalledWith(ADMIN_SIGN_IN_PER_EMAIL, "njomza@nyoki.co.uk");
  });

  it.each([
    ["the address", ADMIN_SIGN_IN_PER_ADDRESS],
    ["the email", ADMIN_SIGN_IN_PER_EMAIL],
  ])("asks for a wait once %s has failed too often, without checking the password", async (_, reached) => {
    isLimited.mockImplementation(async (limit) => limit === reached);

    const result = await login({ error: null, email: "" }, tried);

    expect(result).toEqual({ error: WAIT_A_WHILE, email: " Njomza@Nyoki.co.uk " });
    // Checking costs a deliberately slow hash; a script is refused before it.
    expect(authenticateAdmin).not.toHaveBeenCalled();
  });

  it("counts nothing when the password is right", async () => {
    authenticateAdmin.mockResolvedValue({ userId: "a1", email: "njomza@nyoki.co.uk", role: "OWNER" });

    await expect(login({ error: null, email: "" }, tried)).rejects.toThrow("NEXT_REDIRECT /admin");
    expect(recordAttempt).not.toHaveBeenCalled();
    expect(startSession).toHaveBeenCalled();
  });
});
