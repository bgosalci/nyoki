/**
 * @jest-environment node
 */

const cookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => cookieStore),
}));

import {
  SESSION_COOKIE,
  createSessionToken,
  type SessionPayload,
} from "@/lib/auth/session";
import {
  destroySession,
  readSession,
  startSession,
} from "@/lib/auth/session-cookie";

const SECRET = "test-secret-at-least-32-bytes-long-for-hs256";

const session: SessionPayload = {
  userId: "admin_1",
  email: "njomza@nyoki.co.uk",
  role: "STAFF",
};

describe("session cookie", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, AUTH_SECRET: SECRET };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("sets an httpOnly, sameSite cookie scoped to the whole site", async () => {
    await startSession(session);

    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
  });

  it("marks the cookie secure in production", async () => {
    process.env = { ...process.env, NODE_ENV: "production" } as NodeJS.ProcessEnv;

    await startSession(session);

    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.any(String),
      expect.objectContaining({ secure: true }),
    );
  });

  it("does not require https in development", async () => {
    process.env = { ...process.env, NODE_ENV: "development" } as NodeJS.ProcessEnv;

    await startSession(session);

    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.any(String),
      expect.objectContaining({ secure: false }),
    );
  });

  it("reads back a session it wrote", async () => {
    const token = await createSessionToken(session, SECRET);
    cookieStore.get.mockReturnValue({ value: token });

    await expect(readSession()).resolves.toMatchObject(session);
  });

  it("returns null when there is no cookie", async () => {
    cookieStore.get.mockReturnValue(undefined);

    await expect(readSession()).resolves.toBeNull();
  });

  it("returns null for a cookie signed with another secret", async () => {
    const token = await createSessionToken(session, "a-different-secret-32-bytes-long!!");
    cookieStore.get.mockReturnValue({ value: token });

    await expect(readSession()).resolves.toBeNull();
  });

  it("deletes the cookie on sign out", async () => {
    await destroySession();

    expect(cookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE);
  });

  it("refuses to start a session with no AUTH_SECRET configured", async () => {
    delete process.env.AUTH_SECRET;

    await expect(startSession(session)).rejects.toThrow(/AUTH_SECRET/);
  });
});
