/**
 * @jest-environment node
 */
import { lineKey } from "@/lib/basket/key";
import type { StoredChoices } from "@/lib/basket/lines";

const base: StoredChoices = {
  variantId: null,
  packId: "p3",
  message: "Printed message",
  messageText: "Merry Christmas",
  personalise: true,
  personalisation: { f1: "Ada", f2: "Leo" },
};

describe("lineKey", () => {
  it("is the same for the same piece with the same choices, whatever order they were filled in", () => {
    expect(lineKey("card", base)).toBe(lineKey("card", { ...base, personalisation: { f2: "Leo", f1: "Ada" } }));
  });

  it("differs for different words inside, a different pack, or another piece", () => {
    const key = lineKey("card", base);

    expect(lineKey("card", { ...base, messageText: "Happy Christmas" })).not.toBe(key);
    expect(lineKey("card", { ...base, packId: null })).not.toBe(key);
    expect(lineKey("other", base)).not.toBe(key);
  });

  it("is short enough to index, however long the words", () => {
    expect(lineKey("card", { ...base, messageText: "x".repeat(5000) })).toMatch(/^[0-9a-f]{64}$/);
  });
});
