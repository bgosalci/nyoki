/**
 * @jest-environment node
 */
const requireAdmin = jest.fn();
const requireOwner = jest.fn();
const startSession = jest.fn();
const findUnique = jest.fn();
const findMany = jest.fn();
const update = jest.fn();
const remove = jest.fn();
const transaction = jest.fn();

const adminUser = {
  findUnique: (args: unknown) => findUnique(args),
  findMany: (args: unknown) => findMany(args),
  update: (args: unknown) => update(args),
  delete: (args: unknown) => remove(args),
};

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    // A getter: the factory runs before the constants above are set.
    get adminUser() {
      return adminUser;
    },
    $transaction: (run: (tx: unknown) => Promise<unknown>, options: unknown) => transaction(run, options),
  },
}));
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: () => requireAdmin(), requireOwner: () => requireOwner() }));
jest.mock("../src/lib/auth/session-cookie", () => ({ startSession: (...args: unknown[]) => startSession(...args) }));
jest.mock("../src/lib/auth/password", () => ({
  hashPassword: async (password: string) => `hashed:${password}`,
  verifyPassword: async (password: string, hash: string) => hash === `hashed:${password}`,
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { changePassword, removeAdmin, resetAdminPassword, updateAdmin } from "@/app/admin/(protected)/settings/actions";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const owner = { userId: "o1", email: "njomza@nyoki.co.uk", role: "OWNER" as const };
const team = [
  { id: "o1", role: "OWNER" },
  { id: "o2", role: "OWNER" },
  { id: "s1", role: "STAFF" },
];

beforeEach(() => {
  jest.clearAllMocks();
  requireAdmin.mockResolvedValue(owner);
  requireOwner.mockResolvedValue(owner);
  findMany.mockResolvedValue(team);
  transaction.mockImplementation(async (run) => run({ adminUser }));
});

describe("changePassword", () => {
  const change = form({ currentPassword: "the old password", newPassword: "a brand new password", confirmPassword: "a brand new password" });

  // Changed because someone else may know it: every session signed before
  // the change stops working, and this one is signed afresh.
  it("ends every other session, and keeps this one signed in", async () => {
    findUnique.mockResolvedValue({ id: "o1", passwordHash: "hashed:the old password" });
    const before = Date.now();

    await expect(changePassword({ errors: {}, done: false }, change)).resolves.toEqual({ errors: {}, done: true });

    const { data } = update.mock.calls[0][0];
    expect(data.passwordHash).toBe("hashed:a brand new password");
    expect(data.sessionsValidFrom.getTime()).toBeGreaterThanOrEqual(before);
    expect(startSession).toHaveBeenCalledWith(owner);
  });
});

describe("resetAdminPassword", () => {
  // Reset because the account may be in the wrong hands: whoever is signed
  // in to it is signed out, and only the new password opens it.
  it("signs the account out everywhere", async () => {
    findUnique.mockResolvedValue({ id: "s1" });
    const before = Date.now();

    const result = await resetAdminPassword("s1", { password: null, error: null }, form({}));

    expect(result.password).toEqual(expect.any(String));
    const { where, data } = update.mock.calls[0][0];
    expect(where).toEqual({ id: "s1" });
    expect(data.sessionsValidFrom.getTime()).toBeGreaterThanOrEqual(before);
    expect(startSession).not.toHaveBeenCalled();
  });
});

describe("the last owner, with two owners acting at once", () => {
  // Two owners removing (or demoting) each other at the same moment each
  // read two owners and passed the check, leaving the shop with none.
  // Checked and written in one serializable transaction, the second fails.
  it("removes in one serializable transaction, the check inside it", async () => {
    await expect(removeAdmin("o2", { error: null }, form({}))).resolves.toEqual({ error: null });

    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(remove).toHaveBeenCalledWith({ where: { id: "o2" } });
  });

  it("changes a role in one serializable transaction, the check inside it", async () => {
    await updateAdmin("o2", { errors: {}, saved: false }, form({ name: "Burim", role: "STAFF" }));

    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(update).toHaveBeenCalledWith({ where: { id: "o2" }, data: { name: "Burim", role: "STAFF" } });
  });

  it("asks the loser of the race to try again", async () => {
    transaction.mockRejectedValue(Object.assign(new Error("could not serialize access"), { code: "P2034" }));

    await expect(removeAdmin("o2", { error: null }, form({}))).resolves.toEqual({
      error: "Someone else changed the team at the same moment. Please try again.",
    });
    await expect(updateAdmin("o2", { errors: {}, saved: false }, form({ name: "Burim", role: "STAFF" }))).resolves.toEqual({
      errors: { role: "Someone else changed the team at the same moment. Please try again." },
      saved: false,
    });
  });

  it("still refuses to remove the last owner", async () => {
    findMany.mockResolvedValue([
      { id: "o1", role: "OWNER" },
      { id: "s1", role: "STAFF" },
    ]);

    const result = await removeAdmin("o1", { error: null }, form({}));

    expect(result.error).toEqual(expect.any(String));
    expect(remove).not.toHaveBeenCalled();
  });
});
