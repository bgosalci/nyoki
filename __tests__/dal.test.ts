/**
 * @jest-environment node
 */

const readSession = jest.fn();
const findUnique = jest.fn();
const redirect = jest.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

jest.mock("server-only", () => ({}));
jest.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/auth/session-cookie", () => ({ readSession: () => readSession() }));
jest.mock("../src/lib/db", () => ({ db: { adminUser: { findUnique: (args: unknown) => findUnique(args) } } }));

import { requireAdmin, requireOwner } from "@/lib/auth/dal";

const cookieSession = { userId: "u_1", email: "burim@nyoki.co.uk", role: "STAFF" as const };

describe("requireAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends a visitor with no session to the login page", async () => {
    readSession.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/login");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("signs out a session whose account has been removed", async () => {
    // Otherwise a removed account keeps working until its cookie expires.
    readSession.mockResolvedValue(cookieSession);
    findUnique.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/admin/sign-out");
  });

  it("uses the role from the database, not the one baked into the cookie", async () => {
    // A promotion takes effect on the next request, not the next sign-in.
    readSession.mockResolvedValue(cookieSession);
    findUnique.mockResolvedValue({ id: "u_1", email: "burim@nyoki.co.uk", role: "OWNER" });

    await expect(requireAdmin()).resolves.toEqual({ userId: "u_1", email: "burim@nyoki.co.uk", role: "OWNER" });
  });

  it("looks the account up by the id in the session", async () => {
    readSession.mockResolvedValue(cookieSession);
    findUnique.mockResolvedValue({ id: "u_1", email: "burim@nyoki.co.uk", role: "STAFF" });

    await requireAdmin();

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u_1" } }));
  });
});

describe("requireOwner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readSession.mockResolvedValue(cookieSession);
  });

  it("lets a live owner through even if the cookie still says staff", async () => {
    findUnique.mockResolvedValue({ id: "u_1", email: "burim@nyoki.co.uk", role: "OWNER" });

    await expect(requireOwner()).resolves.toMatchObject({ role: "OWNER" });
  });

  it("sends staff to the overview", async () => {
    findUnique.mockResolvedValue({ id: "u_1", email: "burim@nyoki.co.uk", role: "STAFF" });

    await expect(requireOwner()).rejects.toThrow("REDIRECT:/admin");
  });
});
