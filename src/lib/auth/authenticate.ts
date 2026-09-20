import { verifyPassword } from "@/lib/auth/password";
import type { AdminRole, SessionPayload } from "@/lib/auth/session";

export interface AdminRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
}

export interface AuthenticateDeps {
  findAdminByEmail(email: string): Promise<AdminRecord | null>;
}

/**
 * A real bcrypt hash of a value nobody knows, compared against when no account
 * matches. Without it the "unknown email" path returns without hashing and is
 * therefore dramatically faster than "wrong password", which tells an attacker
 * which addresses have CMS accounts.
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.nnEFsb4Zx0AKlgHY8qUqBS4b1Kx0uZq";

/** Emails are compared case-insensitively and stored lower-cased. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Checks CMS credentials.
 *
 * Returns the session to issue, or null for any failure. The caller cannot
 * distinguish "no such account" from "wrong password", and neither can the
 * person at the login form.
 */
export async function authenticateAdmin(
  email: string,
  password: string,
  deps: AuthenticateDeps,
): Promise<SessionPayload | null> {
  const normalised = normaliseEmail(email);

  // Nothing to check, and no reason to touch the database.
  if (normalised.length === 0 || password.length === 0) return null;

  const admin = await deps.findAdminByEmail(normalised);

  const matches = await verifyPassword(password, admin?.passwordHash ?? DUMMY_HASH);

  if (!admin || !matches) return null;

  return {
    userId: admin.id,
    email: admin.email,
    role: admin.role,
  };
}
