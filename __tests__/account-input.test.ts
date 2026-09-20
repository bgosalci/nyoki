import {
  MIN_CUSTOMER_PASSWORD_LENGTH,
  validateCustomerDetails,
  validateCustomerPasswordChange,
  validateRegistration,
  validateSignIn,
} from "@/lib/account/validate";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const good = { name: "Ada Lovelace", email: "Ada@Example.com ", password: "correct horse battery" };

describe("validateRegistration", () => {
  it("takes a name, an email and a password", () => {
    expect(validateRegistration(form(good))).toEqual({
      ok: true,
      data: { name: "Ada Lovelace", email: "ada@example.com", password: "correct horse battery" },
    });
  });

  it("asks for a name, since that is how the shop will address them", () => {
    const result = validateRegistration(form({ ...good, name: "  " }));

    expect(result.ok === false && result.errors.name).toMatch(/name/i);
  });

  it("catches something that is not an email address", () => {
    const result = validateRegistration(form({ ...good, email: "ada at example" }));

    expect(result.ok === false && result.errors.email).toMatch(/email/i);
  });

  it("asks for a password long enough to be worth having", () => {
    const result = validateRegistration(form({ ...good, password: "short" }));

    expect(result.ok === false && result.errors.password).toContain(String(MIN_CUSTOMER_PASSWORD_LENGTH));
  });

  it("refuses a password bcrypt would quietly cut short", () => {
    const result = validateRegistration(form({ ...good, password: "a".repeat(73) }));

    expect(result.ok === false && result.errors.password).toBeTruthy();
  });

  it("never trims a password, because a space in one is a character like any other", () => {
    const password = ` ${"spaces at both ends"} `;
    const result = validateRegistration(form({ ...good, password }));

    expect(result.ok === true && result.data.password).toBe(password);
  });

  it("collects every problem at once rather than one per attempt", () => {
    const result = validateRegistration(form({ name: "", email: "nope", password: "x" }));

    expect(result.ok).toBe(false);
    expect(result.ok === false && Object.keys(result.errors).sort()).toEqual(["email", "name", "password"]);
  });
});

describe("validateSignIn", () => {
  it("normalises the email so a capital letter is not a wrong password", () => {
    expect(validateSignIn(form({ email: " Ada@Example.com", password: "whatever" }))).toEqual({
      ok: true,
      data: { email: "ada@example.com", password: "whatever" },
    });
  });

  it("asks for both before troubling the database", () => {
    expect(validateSignIn(form({ email: "", password: "" })).ok).toBe(false);
  });

  it("does not hold a returning shopper to the length rule", () => {
    // The rule can tighten later; somebody who registered under the old one
    // must still be able to sign in.
    expect(validateSignIn(form({ email: "ada@example.com", password: "old" })).ok).toBe(true);
  });
});

describe("validateCustomerDetails", () => {
  it("takes a name and an email", () => {
    expect(validateCustomerDetails(form({ name: " Ada Lovelace ", email: "Ada@Example.com" }))).toEqual({
      ok: true,
      data: { name: "Ada Lovelace", email: "ada@example.com" },
    });
  });

  it("will not let the name be emptied", () => {
    expect(validateCustomerDetails(form({ name: "", email: "ada@example.com" })).ok).toBe(false);
  });

  it("will not let the email be made unusable", () => {
    expect(validateCustomerDetails(form({ name: "Ada", email: "nope" })).ok).toBe(false);
  });
});

describe("validateCustomerPasswordChange", () => {
  const good = { currentPassword: "old password", newPassword: "a new password", confirmPassword: "a new password" };

  it("takes the current one and the new one", () => {
    expect(validateCustomerPasswordChange(form(good))).toEqual({
      ok: true,
      data: { currentPassword: "old password", newPassword: "a new password" },
    });
  });

  it("asks for the current password, so a borrowed screen cannot change it", () => {
    const result = validateCustomerPasswordChange(form({ ...good, currentPassword: "" }));

    expect(result.ok === false && result.errors.currentPassword).toBeTruthy();
  });

  it("holds the new one to the same length rule as registration", () => {
    const result = validateCustomerPasswordChange(form({ ...good, newPassword: "short", confirmPassword: "short" }));

    expect(result.ok === false && result.errors.newPassword).toContain(String(MIN_CUSTOMER_PASSWORD_LENGTH));
  });

  it("catches a typo in the confirmation", () => {
    const result = validateCustomerPasswordChange(form({ ...good, confirmPassword: "a new passwrod" }));

    expect(result.ok === false && result.errors.confirmPassword).toMatch(/match/i);
  });

  it("refuses a change that changes nothing", () => {
    const same = "the same password";
    const result = validateCustomerPasswordChange(
      form({ currentPassword: same, newPassword: same, confirmPassword: same }),
    );

    expect(result.ok === false && result.errors.newPassword).toBeTruthy();
  });
});
