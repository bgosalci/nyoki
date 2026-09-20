/**
 * @jest-environment node
 */

import { authenticateCustomer, type CustomerRecord } from "@/lib/account/authenticate";
import { hashPassword } from "@/lib/auth/password";

const PASSWORD = "correct horse battery";

async function customer(overrides: Partial<CustomerRecord> = {}): Promise<CustomerRecord> {
  return {
    id: "c1",
    email: "ada@example.com",
    passwordHash: await hashPassword(PASSWORD),
    ...overrides,
  };
}

function deps(record: CustomerRecord | null) {
  const findCustomerByEmail = jest.fn(async () => record);
  return { findCustomerByEmail };
}

describe("authenticateCustomer", () => {
  it("lets a shopper in with the right password", async () => {
    const result = await authenticateCustomer("ada@example.com", PASSWORD, deps(await customer()));

    expect(result).toEqual({ customerId: "c1", email: "ada@example.com" });
  });

  it("turns away the wrong password", async () => {
    expect(await authenticateCustomer("ada@example.com", "guess", deps(await customer()))).toBeNull();
  });

  it("turns away an email with no account, the same way", async () => {
    expect(await authenticateCustomer("nobody@example.com", PASSWORD, deps(null))).toBeNull();
  });

  it("turns away a customer who has never set a password", async () => {
    // A guest checkout creates the row without one. It is not an account yet,
    // and no password can open it.
    const guest = await customer({ passwordHash: null });

    expect(await authenticateCustomer("ada@example.com", PASSWORD, deps(guest))).toBeNull();
    expect(await authenticateCustomer("ada@example.com", "", deps(guest))).toBeNull();
  });

  it("hashes even when there is nothing to compare against", async () => {
    // Returning early would make an unknown email answer far faster than a
    // wrong password, which tells an attacker which addresses are registered.
    const unknown = deps(null);
    const started = Date.now();
    await authenticateCustomer("nobody@example.com", PASSWORD, unknown);
    const withoutAccount = Date.now() - started;

    const wrong = Date.now();
    await authenticateCustomer("ada@example.com", "guess", deps(await customer()));
    const withAccount = Date.now() - wrong;

    // bcrypt at cost 12 takes hundreds of milliseconds; an early return would
    // be under a millisecond.
    expect(withoutAccount).toBeGreaterThan(withAccount / 4);
  });

  it("looks the email up normalised, so a capital is not a wrong password", async () => {
    const found = deps(await customer());
    await authenticateCustomer("  Ada@Example.com ", PASSWORD, found);

    expect(found.findCustomerByEmail).toHaveBeenCalledWith("ada@example.com");
  });

  it("does not touch the database when nothing was typed", async () => {
    const untouched = deps(await customer());

    expect(await authenticateCustomer("", "", untouched)).toBeNull();
    expect(untouched.findCustomerByEmail).not.toHaveBeenCalled();
  });
});
