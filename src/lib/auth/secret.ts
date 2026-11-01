/**
 * The shop's one secret, `AUTH_SECRET`: it signs the CMS's and shoppers'
 * sessions and a guest's basket cookie, and keys the hashes the rate limits
 * and known browsers are kept by. Read here, failing loudly if it is missing.
 *
 * Deliberately not defaulted: a fallback secret would let the shop boot in
 * production with sessions anyone could forge.
 */
export function authSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.");
  }

  return secret;
}
