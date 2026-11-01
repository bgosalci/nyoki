/**
 * @jest-environment node
 */
const findUnique = jest.fn();
const update = jest.fn();
const create = jest.fn();
const startCustomerSession = jest.fn();
const requireCustomer = jest.fn();
const attempt = jest.fn();
const forget = jest.fn();
const isKnownBrowser = jest.fn();
const rememberBrowser = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    customer: {
      findUnique: (args: unknown) => findUnique(args),
      update: (args: unknown) => update(args),
      create: (args: unknown) => create(args),
    },
  },
}));
jest.mock("../src/lib/account/session-cookie", () => ({ startCustomerSession: (...args: unknown[]) => startCustomerSession(...args) }));
jest.mock("../src/lib/account/dal", () => ({ requireCustomer: () => requireCustomer() }));
jest.mock("../src/lib/auth/password", () => ({
  hashPassword: async (password: string) => `hashed:${password}`,
  verifyPassword: async (password: string, hash: string) => hash === `hashed:${password}`,
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
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
jest.mock("../src/lib/auth/known-browser", () => ({
  isKnownBrowser: (...args: unknown[]) => isKnownBrowser(...args),
  rememberBrowser: (...args: unknown[]) => rememberBrowser(...args),
}));

import { changePassword, register, signIn } from "@/app/(shop)/account/actions";
import { REGISTER_PER_ADDRESS, SIGN_IN_PER_ADDRESS, SIGN_IN_PER_EMAIL, WAIT_A_WHILE, emailKey } from "@/lib/rate-limit";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.AUTH_SECRET = "test-secret-at-least-32-bytes-long-for-hs256";
  attempt.mockResolvedValue({ over: false, forget });
  isKnownBrowser.mockResolvedValue(false);
  findUnique.mockResolvedValue(null);
  update.mockResolvedValue({ id: "c1" });
  create.mockResolvedValue({ id: "c1" });
});

describe("signIn's limit on failed attempts", () => {
  const tried = form({ email: "Ada@Example.com", password: "not the one" });

  it("counts a failure against the address and a hash of the email", async () => {
    await expect(signIn({ error: null }, tried)).resolves.toEqual({ error: "Those details are not right. Please try again.", email: "Ada@Example.com" });

    expect(attempt).toHaveBeenCalledWith(SIGN_IN_PER_ADDRESS, "address-hash");
    expect(attempt).toHaveBeenCalledWith(SIGN_IN_PER_EMAIL, emailKey("ada@example.com"));
    expect(forget).not.toHaveBeenCalled();
  });

  it.each([
    ["the address", SIGN_IN_PER_ADDRESS],
    ["the email", SIGN_IN_PER_EMAIL],
  ])("asks for a wait once %s has had too many, without looking the account up", async (_, reached) => {
    attempt.mockImplementation(async (limit) => ({ over: limit === reached, forget }));

    await expect(signIn({ error: null }, tried)).resolves.toEqual({ error: WAIT_A_WHILE, email: "Ada@Example.com" });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("takes a sign-in that works back off the counts, and knows the browser from then on", async () => {
    findUnique.mockResolvedValue({ id: "c1", email: "ada@example.com", passwordHash: "hashed:not the one" });

    await expect(signIn({ error: null }, tried)).rejects.toThrow("NEXT_REDIRECT");
    expect(forget).toHaveBeenCalledTimes(2);
    expect(rememberBrowser).toHaveBeenCalledWith("shopper", "ada@example.com");
  });

  it("lets a browser that has signed in to the account past the email's limit", async () => {
    isKnownBrowser.mockResolvedValue(true);

    await signIn({ error: null }, tried);

    expect(isKnownBrowser).toHaveBeenCalledWith("shopper", "ada@example.com");
    expect(attempt).not.toHaveBeenCalledWith(SIGN_IN_PER_EMAIL, expect.anything());
  });
});

describe("register's limit", () => {
  const filled = form({ name: "Ada", email: "ada@example.com", password: "correct horse battery" });

  it("counts each registration against the address it came from", async () => {
    await expect(register({ errors: {} }, filled)).rejects.toThrow("NEXT_REDIRECT /account");

    expect(attempt).toHaveBeenCalledWith(REGISTER_PER_ADDRESS, "address-hash");
    expect(rememberBrowser).toHaveBeenCalledWith("shopper", "ada@example.com");
  });

  it("asks an address that has registered too often to wait", async () => {
    attempt.mockImplementation(async (limit) => ({ over: limit === REGISTER_PER_ADDRESS, forget }));

    await expect(register({ errors: {} }, filled)).resolves.toEqual({
      errors: { email: WAIT_A_WHILE },
      values: { name: "Ada", email: "ada@example.com" },
    });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("changePassword", () => {
  const change = form({ currentPassword: "old password", newPassword: "a new password", confirmPassword: "a new password" });

  beforeEach(() => {
    requireCustomer.mockResolvedValue({ id: "c1", email: "ada@example.com", name: "Ada" });
    findUnique.mockResolvedValue({ passwordHash: "hashed:old password" });
  });

  // A password is changed because someone else may know it: every session
  // signed before the change stops working, wherever it is.
  it("ends every session signed before the change, and keeps this one signed in", async () => {
    const before = Date.now();

    await expect(changePassword({ errors: {} }, change)).resolves.toEqual({ errors: {}, changed: true });

    const { data } = update.mock.calls[0][0];
    expect(data.passwordHash).toBe("hashed:a new password");
    expect(data.sessionsValidFrom.getTime()).toBeGreaterThanOrEqual(before);
    expect(startCustomerSession).toHaveBeenCalledWith({ customerId: "c1", email: "ada@example.com" });
  });

  it("changes nothing for the wrong current password", async () => {
    await changePassword({ errors: {} }, form({ currentPassword: "a guess", newPassword: "a new password", confirmPassword: "a new password" }));

    expect(update).not.toHaveBeenCalled();
    expect(startCustomerSession).not.toHaveBeenCalled();
  });
});
