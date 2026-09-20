import bcrypt from "bcryptjs";

/**
 * Password hashing for CMS accounts.
 *
 * bcryptjs rather than native bcrypt or argon2: it is pure JavaScript, so it
 * needs no install script and cannot break a Vercel build on a missing
 * prebuilt binary. Admin logins are low volume, so the speed cost is
 * irrelevant here.
 */

// bcrypt silently truncates anything past 72 bytes, so a longer passphrase
// would have its tail ignored. Reject instead of quietly weakening it.
const MAX_PASSWORD_BYTES = 72;

const COST = 12;

export async function hashPassword(password: string): Promise<string> {
  if (password.length === 0) {
    throw new Error("Password must not be empty");
  }

  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw new Error(
      `Password must be at most ${MAX_PASSWORD_BYTES} bytes; bcrypt ignores anything beyond that`,
    );
  }

  return bcrypt.hash(password, COST);
}

/**
 * Whether `password` matches `hash`.
 *
 * Returns false rather than throwing on a malformed hash: a corrupt row in the
 * database should read as "wrong password", not crash the login route.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
