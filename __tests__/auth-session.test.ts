/**
 * @jest-environment node
 */

import {
  createSessionToken,
  signedBefore,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth/session";

const SECRET = "test-secret-at-least-32-bytes-long-for-hs256";
const OTHER_SECRET = "a-completely-different-secret-also-32-bytes";

const session: SessionPayload = {
  userId: "admin_123",
  email: "njomza@nyoki.co.uk",
  role: "STAFF",
};

describe("session tokens", () => {
  it("round-trips a session", async () => {
    const token = await createSessionToken(session, SECRET);

    await expect(verifySessionToken(token, SECRET)).resolves.toMatchObject(
      session,
    );
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken(session, OTHER_SECRET);

    await expect(verifySessionToken(token, SECRET)).resolves.toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken(session, SECRET);
    // Flip a character in the payload segment.
    const [header, payload, signature] = token.split(".");
    const tampered = [header, payload.slice(0, -1) + "X", signature].join(".");

    await expect(verifySessionToken(tampered, SECRET)).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await createSessionToken(session, SECRET);
    const wellAfterExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);

    await expect(
      verifySessionToken(token, SECRET, { now: wellAfterExpiry }),
    ).resolves.toBeNull();
  });

  it("rejects a token that is not a JWT at all", async () => {
    await expect(verifySessionToken("garbage", SECRET)).resolves.toBeNull();
  });

  it("rejects an empty token", async () => {
    await expect(verifySessionToken("", SECRET)).resolves.toBeNull();
  });

  it("refuses to sign with a weak secret", async () => {
    await expect(createSessionToken(session, "short")).rejects.toThrow(
      /secret/i,
    );
  });
});

describe("when a session was signed", () => {
  it("comes back out of the token, in whole seconds", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createSessionToken(session, SECRET);

    const verified = await verifySessionToken(token, SECRET);

    expect(verified?.issuedAt).toBeGreaterThanOrEqual(before);
    expect(verified?.issuedAt).toBeLessThanOrEqual(Math.ceil(Date.now() / 1000));
  });
});

describe("signedBefore", () => {
  const changed = new Date("2026-11-01T12:00:00.750Z");
  const second = Math.floor(changed.getTime() / 1000);

  it("is never true for an account whose password has not changed", () => {
    expect(signedBefore(0, null)).toBe(false);
  });

  it("is true for a session signed in an earlier second than the change", () => {
    expect(signedBefore(second - 1, changed)).toBe(true);
  });

  // A token records whole seconds, and the session signed afresh by the
  // change itself is signed in the same second as it.
  it("is false for a session signed in the second of the change, or after", () => {
    expect(signedBefore(second, changed)).toBe(false);
    expect(signedBefore(second + 60, changed)).toBe(false);
  });
});
