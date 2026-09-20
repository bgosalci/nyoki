/**
 * @jest-environment node
 */

const readCustomerSession = jest.fn();
const findUnique = jest.fn();
const redirect = jest.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

jest.mock("server-only", () => ({}));
jest.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/account/session-cookie", () => ({ readCustomerSession: () => readCustomerSession() }));
jest.mock("../src/lib/db", () => ({ db: { customer: { findUnique: (args: unknown) => findUnique(args) } } }));

import { currentCustomer, requireCustomer } from "@/lib/account/dal";

const cookieSession = { customerId: "c_1", email: "ada@example.com" };
// Shaped like the row the DAL actually selects, hash included.
const row = { id: "c_1", email: "ada@example.com", name: "Ada Lovelace", passwordHash: "$2b$12$hash" };
const shopper = { id: "c_1", email: "ada@example.com", name: "Ada Lovelace" };

beforeEach(() => jest.clearAllMocks());

describe("currentCustomer", () => {
  it("is nobody when there is no cookie", async () => {
    readCustomerSession.mockResolvedValue(null);

    expect(await currentCustomer()).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("reads the shopper from the database rather than trusting the cookie", async () => {
    // A name changed on the account page has to show at once, and the cookie
    // is thirty days old by then.
    readCustomerSession.mockResolvedValue(cookieSession);
    findUnique.mockResolvedValue(row);

    expect(await currentCustomer()).toEqual(shopper);
  });

  it("is nobody when the account has gone", async () => {
    readCustomerSession.mockResolvedValue(cookieSession);
    findUnique.mockResolvedValue(null);

    expect(await currentCustomer()).toBeNull();
  });

  it("is nobody when the account no longer has a password", async () => {
    // Clearing the hash is how an account is closed back down to a guest
    // record; the sessions it left behind must stop working.
    readCustomerSession.mockResolvedValue(cookieSession);
    findUnique.mockResolvedValue({ ...row, passwordHash: null });

    expect(await currentCustomer()).toBeNull();
  });
});

describe("requireCustomer", () => {
  it("sends a signed-out visitor to sign in", async () => {
    readCustomerSession.mockResolvedValue(null);

    await expect(requireCustomer()).rejects.toThrow("REDIRECT:/account/sign-in");
  });

  it("clears a cookie whose account has gone, rather than looping on it", async () => {
    readCustomerSession.mockResolvedValue(cookieSession);
    findUnique.mockResolvedValue(null);

    await expect(requireCustomer()).rejects.toThrow("REDIRECT:/account/sign-out");
  });

  it("hands back the shopper when there is one", async () => {
    readCustomerSession.mockResolvedValue(cookieSession);
    findUnique.mockResolvedValue(row);

    expect(await requireCustomer()).toEqual(shopper);
  });
});
