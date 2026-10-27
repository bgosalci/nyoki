import { afterSignIn } from "@/lib/account/next";

describe("afterSignIn", () => {
  it("goes back to checkout or the basket when signing in was asked for there", () => {
    expect(afterSignIn("/checkout")).toBe("/checkout");
    expect(afterSignIn("/basket")).toBe("/basket");
  });

  it("goes to the account for anything else, so a link cannot send a shopper elsewhere", () => {
    expect(afterSignIn(null)).toBe("/account");
    expect(afterSignIn("https://evil.example")).toBe("/account");
    expect(afterSignIn("//evil.example")).toBe("/account");
    expect(afterSignIn("/admin")).toBe("/account");
  });
});
