import { SignJWT, jwtVerify } from "jose";

/**
 * Shopper session tokens.
 *
 * The same shape as the CMS's, and deliberately kept apart from it: a
 * different cookie, and a `kind` claim that both verifiers insist on. Both
 * are signed with the same secret, so a valid signature proves only that we
 * issued the token, not what we issued it for - without the claim, a
 * shopper's cookie would verify as a staff session.
 */

export interface CustomerSession {
  customerId: string;
  email: string;
}

export const CUSTOMER_SESSION_COOKIE = "nyoki_customer_session";

const KIND = "customer";
const ALGORITHM = "HS256";
const SESSION_DURATION = "30d";

// HS256 keys shorter than the 256-bit hash buy no extra security and signal a
// placeholder secret that escaped into a real environment.
const MIN_SECRET_BYTES = 32;

function encodeSecret(secret: string): Uint8Array {
  const bytes = new TextEncoder().encode(secret);

  if (bytes.byteLength < MIN_SECRET_BYTES) {
    throw new Error(
      `Session secret must be at least ${MIN_SECRET_BYTES} bytes; got ${bytes.byteLength}`,
    );
  }

  return bytes;
}

export async function createCustomerToken(
  session: CustomerSession,
  secret: string,
): Promise<string> {
  return new SignJWT({ ...session, kind: KIND })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(encodeSecret(secret));
}

/**
 * Returns the session, or null for any token that is not currently a valid
 * shopper session - expired, tampered with, signed by someone else, issued
 * for the CMS instead, or not a JWT at all.
 *
 * There is deliberately no way to tell those apart, so nothing leaks to
 * somebody probing the cookie.
 */
export async function verifyCustomerToken(
  token: string,
  secret: string,
  options: { now?: Date } = {},
): Promise<CustomerSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret), {
      algorithms: [ALGORITHM],
      currentDate: options.now,
    });

    const { customerId, email, kind } = payload as unknown as CustomerSession & { kind?: string };

    if (kind !== KIND) return null;
    if (typeof customerId !== "string" || typeof email !== "string") return null;

    return { customerId, email };
  } catch {
    return null;
  }
}
