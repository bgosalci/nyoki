/**
 * @jest-environment node
 */
import { basketIdFrom, signBasketId } from "@/lib/basket/cookie-signature";

const SECRET = "test-secret-at-least-32-bytes-long-for-hs256";

describe("the basket cookie", () => {
  it("names the basket it was signed for", () => {
    expect(basketIdFrom(signBasketId("cmb123", SECRET), SECRET)).toBe("cmb123");
  });

  // A basket's id is a cuid: a timestamp, a counter and a little randomness,
  // never meant to be secret. Signed, a guessed id opens nothing.
  it("opens nothing for a bare id, as the cookie used to hold", () => {
    expect(basketIdFrom("cmb123", SECRET)).toBeNull();
  });

  it("opens nothing for an id signed with another key, or a signature moved to another id", () => {
    expect(basketIdFrom(signBasketId("cmb123", "a-completely-different-secret-also-32-bytes"), SECRET)).toBeNull();

    const signature = signBasketId("cmb123", SECRET).split(".")[1];
    expect(basketIdFrom(`cmb999.${signature}`, SECRET)).toBeNull();
  });

  it("opens nothing for nonsense", () => {
    for (const value of ["", ".", "cmb123.", ".abc", "a.b.c", "cmb123.not-the-signature"]) {
      expect(basketIdFrom(value, SECRET)).toBeNull();
    }
  });
});
