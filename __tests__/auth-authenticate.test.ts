/**
 * @jest-environment node
 */

import { authenticateAdmin, type AdminRecord } from "@/lib/auth/authenticate";
import { hashPassword } from "@/lib/auth/password";

const PASSWORD = "njomza-correct-password";

async function adminFixture(
  overrides: Partial<AdminRecord> = {},
): Promise<AdminRecord> {
  return {
    id: "admin_1",
    email: "njomza@nyoki.co.uk",
    name: "Njomza",
    passwordHash: await hashPassword(PASSWORD),
    role: "STAFF",
    ...overrides,
  };
}

function depsFor(admin: AdminRecord | null) {
  return {
    findAdminByEmail: jest.fn(async () => admin),
  };
}

describe("authenticateAdmin", () => {
  it("returns a session for correct credentials", async () => {
    const admin = await adminFixture();

    await expect(
      authenticateAdmin("njomza@nyoki.co.uk", PASSWORD, depsFor(admin)),
    ).resolves.toEqual({
      userId: "admin_1",
      email: "njomza@nyoki.co.uk",
      role: "STAFF",
    });
  });

  it("rejects the wrong password", async () => {
    const admin = await adminFixture();

    await expect(
      authenticateAdmin("njomza@nyoki.co.uk", "wrong", depsFor(admin)),
    ).resolves.toBeNull();
  });

  it("rejects an unknown email", async () => {
    await expect(
      authenticateAdmin("nobody@nyoki.co.uk", PASSWORD, depsFor(null)),
    ).resolves.toBeNull();
  });

  it("normalises the email before looking it up", async () => {
    const admin = await adminFixture();
    const deps = depsFor(admin);

    await authenticateAdmin("  NJOMZA@Nyoki.co.uk  ", PASSWORD, deps);

    expect(deps.findAdminByEmail).toHaveBeenCalledWith("njomza@nyoki.co.uk");
  });

  it("rejects an empty password without consulting the database", async () => {
    const deps = depsFor(await adminFixture());

    await expect(
      authenticateAdmin("njomza@nyoki.co.uk", "", deps),
    ).resolves.toBeNull();
    expect(deps.findAdminByEmail).not.toHaveBeenCalled();
  });

  it("rejects an empty email without consulting the database", async () => {
    const deps = depsFor(await adminFixture());

    await expect(authenticateAdmin("   ", PASSWORD, deps)).resolves.toBeNull();
    expect(deps.findAdminByEmail).not.toHaveBeenCalled();
  });

  it("still performs a hash comparison when the email is unknown", async () => {
    // Guards against user enumeration: a missing account must not return
    // measurably faster than a wrong password, which would let an attacker
    // discover which email addresses have CMS accounts.
    const missing = depsFor(null);
    const existing = depsFor(await adminFixture());

    const missingStart = process.hrtime.bigint();
    await authenticateAdmin("nobody@nyoki.co.uk", PASSWORD, missing);
    const missingNs = process.hrtime.bigint() - missingStart;

    const wrongStart = process.hrtime.bigint();
    await authenticateAdmin("njomza@nyoki.co.uk", "wrong", existing);
    const wrongNs = process.hrtime.bigint() - wrongStart;

    // Both paths run one bcrypt comparison, so they should be the same order
    // of magnitude. A short-circuit would make the missing path ~100x faster.
    const ratio = Number(wrongNs) / Number(missingNs);
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(5);
  });

  it("preserves the OWNER role", async () => {
    const owner = await adminFixture({ role: "OWNER", id: "admin_owner" });

    await expect(
      authenticateAdmin("njomza@nyoki.co.uk", PASSWORD, depsFor(owner)),
    ).resolves.toMatchObject({ role: "OWNER" });
  });
});
