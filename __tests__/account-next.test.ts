import { afterSignIn } from "@/lib/account/next";

describe("afterSignIn", () => {
  it("goes back to checkout or the basket when signing in was asked for there", () => {
    expect(afterSignIn("/checkout")).toBe("/checkout");
    expect(afterSignIn("/basket")).toBe("/basket");
  });

  it("goes back to a piece's reviews when signing in was asked for to write one", () => {
    expect(afterSignIn("/product/robin-card#reviews")).toBe("/product/robin-card#reviews");
    expect(afterSignIn("/product/robin-card")).toBe("/product/robin-card");
    // Imported from Shopify, an address can hold what the shop's own would not.
    expect(afterSignIn("/product/ice-lolly-brooch-_-yellow")).toBe("/product/ice-lolly-brooch-_-yellow");
  });

  it("never follows a piece's address somewhere else", () => {
    for (const next of ["/product//evil.example", "/product/a/../../admin", "/product/\\evil.example", "/product/", "/product/a#elsewhere", "/product/a?x=1"]) {
      expect(afterSignIn(next)).toBe("/account");
    }
  });

  it("goes to the account for anything else, so a link cannot send a shopper elsewhere", () => {
    expect(afterSignIn(null)).toBe("/account");
    expect(afterSignIn("https://evil.example")).toBe("/account");
    expect(afterSignIn("//evil.example")).toBe("/account");
    expect(afterSignIn("/admin")).toBe("/account");
  });
});
