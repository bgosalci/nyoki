import { adminUpsert } from "@/lib/admin/upsert";

/**
 * What `pnpm admin:create` writes. Re-running it is the documented reset
 * path, and it changed the password while every session signed in with the
 * old one carried on - unlike a reset from Settings, which ends them.
 */
describe("adminUpsert", () => {
  const account = { email: "staff@nyoki.co.uk", name: "Staff", role: "STAFF" as const, passwordHash: "hash" };
  const now = new Date("2026-11-01T12:00:00Z");

  it("makes a new account as given", () => {
    expect(adminUpsert(account, now)).toMatchObject({
      where: { email: "staff@nyoki.co.uk" },
      create: { email: "staff@nyoki.co.uk", name: "Staff", role: "STAFF", passwordHash: "hash" },
    });
  });

  it("ends every session of an account it resets", () => {
    expect(adminUpsert(account, now).update).toEqual({ name: "Staff", role: "STAFF", passwordHash: "hash", sessionsValidFrom: now });
  });
});
