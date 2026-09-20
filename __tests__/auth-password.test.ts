/**
 * @jest-environment node
 */

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("does not store the password in the hash", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).not.toContain("correct horse battery staple");
  });

  it("accepts the correct password", async () => {
    const hash = await hashPassword("s3cret-pa55word");

    await expect(verifyPassword("s3cret-pa55word", hash)).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("s3cret-pa55word");

    await expect(verifyPassword("not-the-password", hash)).resolves.toBe(false);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");

    expect(a).not.toBe(b);
    // ...but both still verify.
    await expect(verifyPassword("same-password", a)).resolves.toBe(true);
    await expect(verifyPassword("same-password", b)).resolves.toBe(true);
  });

  it("rejects a malformed hash instead of throwing", async () => {
    await expect(verifyPassword("anything", "not-a-bcrypt-hash")).resolves.toBe(
      false,
    );
  });

  it("refuses to hash an empty password", async () => {
    await expect(hashPassword("")).rejects.toThrow(/password/i);
  });
});
