import type { CustomerSession } from "@/lib/account/session";
import { normaliseEmail } from "@/lib/auth/authenticate";
import { verifyPassword } from "@/lib/auth/password";

export interface CustomerRecord {
  id: string;
  email: string;
  /** Null for a guest row from checkout: a customer, but not yet an account. */
  passwordHash: string | null;
}

export interface AuthenticateCustomerDeps {
  findCustomerByEmail(email: string): Promise<CustomerRecord | null>;
}

/**
 * A real bcrypt hash of a value nobody knows, compared against when there is
 * no account or no password on it. Without it those paths return without
 * hashing and are dramatically faster than a wrong password, which tells an
 * attacker which addresses are registered.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.nnEFsb4Zx0AKlgHY8qUqBS4b1Kx0uZq";

/**
 * Checks a shopper's credentials.
 *
 * Returns the session to issue, or null for any failure. The caller cannot
 * tell "no such account" from "wrong password" from "guest with no password
 * set", and neither can the person at the form.
 */
export async function authenticateCustomer(
  email: string,
  password: string,
  deps: AuthenticateCustomerDeps,
): Promise<CustomerSession | null> {
  const normalised = normaliseEmail(email);

  // Nothing to check, and no reason to touch the database.
  if (normalised.length === 0 || password.length === 0) return null;

  const customer = await deps.findCustomerByEmail(normalised);

  const matches = await verifyPassword(password, customer?.passwordHash ?? DUMMY_HASH);

  if (!customer?.passwordHash || !matches) return null;

  return { customerId: customer.id, email: customer.email };
}
