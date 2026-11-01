import { SignJWT, jwtVerify } from "jose";

/**
 * CMS session tokens.
 *
 * A signed JWT in an httpOnly cookie, rather than a session table: the CMS has
 * a handful of users and no need to revoke individual sessions mid-flight.
 * `jose` is pure JavaScript and runs in the edge runtime, so middleware can
 * verify a session without a database round trip.
 */

export type AdminRole = "OWNER" | "STAFF";

export interface SessionPayload {
  userId: string;
  email: string;
  role: AdminRole;
}

/** A session as its token carries it back: who, and when it was signed (whole seconds). */
export interface VerifiedSession extends SessionPayload {
  issuedAt: number;
}

export const SESSION_COOKIE = "nyoki_admin_session";

const ALGORITHM = "HS256";
const SESSION_DURATION = "7d";

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

export async function createSessionToken(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(encodeSecret(secret));
}

/**
 * Returns the session, or null for any token that is not currently valid -
 * expired, tampered with, signed by someone else, or not a JWT.
 *
 * Callers treat null as "not signed in"; there is deliberately no way to
 * distinguish the reasons, so nothing leaks to an attacker probing the cookie.
 */
export async function verifySessionToken(
  token: string,
  secret: string,
  options: { now?: Date } = {},
): Promise<VerifiedSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret), {
      algorithms: [ALGORITHM],
      currentDate: options.now,
    });

    const { userId, email, role, kind, iat } = payload as unknown as SessionPayload & { kind?: string; iat?: number };

    // A shopper's token is signed with this same secret, so the signature
    // alone proves nothing about who it was issued for. It carries kind
    // "customer"; a staff token carries none.
    if (kind !== undefined) return null;
    if (typeof userId !== "string" || typeof email !== "string") return null;
    if (role !== "OWNER" && role !== "STAFF") return null;
    if (typeof iat !== "number") return null;

    return { userId, email, role, issuedAt: iat };
  } catch {
    return null;
  }
}

/**
 * Whether a session was signed before its account's password last changed,
 * and so must stop working. Shared by the CMS and the shop's accounts.
 *
 * A token records whole seconds, so the change is compared by its second: the
 * session signed afresh for whoever made the change falls in that same second
 * and stays valid. One signed elsewhere in that very second survives too - a
 * window too narrow to aim at.
 */
export function signedBefore(issuedAt: number, validFrom: Date | null): boolean {
  return validFrom !== null && issuedAt < Math.floor(validFrom.getTime() / 1000);
}
