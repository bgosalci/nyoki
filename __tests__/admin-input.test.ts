import { validateAdminEdit, validateNewAdminInput, validatePasswordChange } from "@/lib/admin/validate";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== "") data.set(key, value);
  }
  return data;
}

describe("validateNewAdminInput", () => {
  it("accepts an email, a name and a role", () => {
    expect(validateNewAdminInput(form({ email: "njomza@nyoki.co.uk", name: "Njomza", role: "STAFF" }))).toEqual({
      ok: true,
      data: { email: "njomza@nyoki.co.uk", name: "Njomza", role: "STAFF" },
    });
  });

  it("normalises the email the same way sign-in does", () => {
    const result = validateNewAdminInput(form({ email: "  NJOMZA@Nyoki.co.uk ", name: "Njomza" }));
    expect(result.ok && result.data.email).toBe("njomza@nyoki.co.uk");
  });

  it("defaults the role to staff", () => {
    const result = validateNewAdminInput(form({ email: "a@b.co", name: "A" }));
    expect(result.ok && result.data.role).toBe("STAFF");
  });

  it("requires an email that looks like one", () => {
    expect(validateNewAdminInput(form({ email: "", name: "A" })).ok).toBe(false);
    const result = validateNewAdminInput(form({ email: "not-an-email", name: "A" }));
    expect(!result.ok && result.errors.email).toMatch(/email/i);
  });

  it("requires a name", () => {
    const result = validateNewAdminInput(form({ email: "a@b.co", name: "  " }));
    expect(!result.ok && result.errors.name).toMatch(/name/i);
  });

  it("rejects an unknown role", () => {
    const result = validateNewAdminInput(form({ email: "a@b.co", name: "A", role: "ADMIN" }));
    expect(!result.ok && result.errors.role).toBeTruthy();
  });
});

describe("validatePasswordChange", () => {
  const good = { currentPassword: "old-password-here", newPassword: "a-much-better-passphrase", confirmPassword: "a-much-better-passphrase" };

  it("accepts a matching, long-enough new password", () => {
    expect(validatePasswordChange(form(good))).toEqual({
      ok: true,
      data: { currentPassword: "old-password-here", newPassword: "a-much-better-passphrase" },
    });
  });

  it("requires the current password", () => {
    const result = validatePasswordChange(form({ ...good, currentPassword: "" }));
    expect(!result.ok && result.errors.currentPassword).toMatch(/current/i);
  });

  it("requires at least 12 characters", () => {
    const result = validatePasswordChange(form({ ...good, newPassword: "short-one", confirmPassword: "short-one" }));
    expect(!result.ok && result.errors.newPassword).toMatch(/12/);
  });

  it("rejects a new password over bcrypt's 72-byte limit rather than truncating", () => {
    const long = "x".repeat(73);
    const result = validatePasswordChange(form({ ...good, newPassword: long, confirmPassword: long }));
    expect(!result.ok && result.errors.newPassword).toMatch(/72/);
  });

  it("requires the confirmation to match", () => {
    const result = validatePasswordChange(form({ ...good, confirmPassword: "a-much-better-passphrasE" }));
    expect(!result.ok && result.errors.confirmPassword).toMatch(/match/i);
  });

  it("refuses to change a password to itself", () => {
    const result = validatePasswordChange(form({ currentPassword: "same-passphrase-twice", newPassword: "same-passphrase-twice", confirmPassword: "same-passphrase-twice" }));
    expect(!result.ok && result.errors.newPassword).toMatch(/different/i);
  });

  it("does not trim passwords, since a leading space is a legitimate character", () => {
    const spaced = " leading-space-passphrase";
    const result = validatePasswordChange(form({ currentPassword: "old-password-here", newPassword: spaced, confirmPassword: spaced }));
    expect(result.ok && result.data.newPassword).toBe(spaced);
  });
});

describe("validateAdminEdit", () => {
  it("accepts a name and a role", () => {
    expect(validateAdminEdit(form({ name: "  Njomza ", role: "OWNER" }))).toEqual({ ok: true, data: { name: "Njomza", role: "OWNER" } });
  });

  it("requires a name", () => {
    const result = validateAdminEdit(form({ name: "", role: "STAFF" }));
    expect(!result.ok && result.errors.name).toMatch(/name/i);
  });

  it("rejects an unknown role", () => {
    const result = validateAdminEdit(form({ name: "A", role: "GOD" }));
    expect(!result.ok && result.errors.role).toBeTruthy();
  });
});
