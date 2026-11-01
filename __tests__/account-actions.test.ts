/**
 * @jest-environment node
 */
const findUnique = jest.fn();
const update = jest.fn();
const create = jest.fn();
const startCustomerSession = jest.fn();
const requireCustomer = jest.fn();
const isLimited = jest.fn();
const recordAttempt = jest.fn();

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
  isLimited: (...args: unknown[]) => isLimited(...args),
  recordAttempt: (...args: unknown[]) => recordAttempt(...args),
  requestAddress: async () => "address-hash",
}));

import { changePassword, register, signIn } from "@/app/(shop)/account/actions";
import { REGISTER_PER_ADDRESS, SIGN_IN_PER_ADDRESS, SIGN_IN_PER_EMAIL, WAIT_A_WHILE } from "@/lib/rate-limit";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  jest.clearAllMocks();
  isLimited.mockResolvedValue(false);
  findUnique.mockResolvedValue(null);
  update.mockResolvedValue({ id: "c1" });
  create.mockResolvedValue({ id: "c1" });
});

describe("signIn's limit on failed attempts", () => {
  const tried = form({ email: "Ada@Example.com", password: "not the one" });

  it("counts a failure against the address and the email", async () => {
    await expect(signIn({ error: null }, tried)).resolves.toEqual({ error: "Those details are not right. Please try again.", email: "Ada@Example.com" });

    expect(recordAttempt).toHaveBeenCalledWith(SIGN_IN_PER_ADDRESS, "address-hash");
    expect(recordAttempt).toHaveBeenCalledWith(SIGN_IN_PER_EMAIL, "ada@example.com");
  });

  it.each([
    ["the address", SIGN_IN_PER_ADDRESS],
    ["the email", SIGN_IN_PER_EMAIL],
  ])("asks for a wait once %s has failed too often, without looking the account up", async (_, reached) => {
    isLimited.mockImplementation(async (limit) => limit === reached);

    await expect(signIn({ error: null }, tried)).resolves.toEqual({ error: WAIT_A_WHILE, email: "Ada@Example.com" });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("counts nothing when the password is right", async () => {
    findUnique.mockResolvedValue({ id: "c1", email: "ada@example.com", passwordHash: "hashed:not the one" });

    await expect(signIn({ error: null }, tried)).rejects.toThrow("NEXT_REDIRECT");
    expect(recordAttempt).not.toHaveBeenCalled();
  });
});

describe("register's limit", () => {
  const filled = form({ name: "Ada", email: "ada@example.com", password: "correct horse battery" });

  it("counts each registration against the address it came from", async () => {
    await expect(register({ errors: {} }, filled)).rejects.toThrow("NEXT_REDIRECT /account");

    expect(recordAttempt).toHaveBeenCalledWith(REGISTER_PER_ADDRESS, "address-hash");
  });

  it("asks an address that has registered too often to wait", async () => {
    isLimited.mockImplementation(async (limit) => limit === REGISTER_PER_ADDRESS);

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
