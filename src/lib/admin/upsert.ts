import type { AdminRole } from "@/lib/auth/session";

/**
 * What `pnpm admin:create` writes: a new account, or an existing one reset.
 *
 * Re-running the script is the documented password reset, so a reset ends
 * every session signed before it (`sessionsValidFrom`), as one from Settings
 * does - it changed the password and left the old sessions signed in.
 */
export function adminUpsert(
  account: { email: string; name: string; role: AdminRole; passwordHash: string },
  now: Date = new Date(),
) {
  const { email, name, role, passwordHash } = account;
  return {
    where: { email },
    create: { email, name, role, passwordHash },
    update: { name, role, passwordHash, sessionsValidFrom: now },
  };
}
