import { APPROVED_TEXT_PAIRINGS, neutral, palette } from "@/lib/brand/palette";
import { DEFAULT_LABEL_COLOUR, isLabelColour, LABEL_COLOURS, labelColourHex } from "@/lib/categories/label-colour";

const hexOf = new Map(palette.map((entry) => [entry.token, entry.hex]));
const onBeige = new Set(APPROVED_TEXT_PAIRINGS.filter((p) => p.surface === neutral.beige).map((p) => p.text));

describe("a category's colour in the shop's header", () => {
  it("is navy to begin with, as every name in the header was", () => {
    expect(DEFAULT_LABEL_COLOUR).toBe("nyoki-navy");
    expect(LABEL_COLOURS[0].token).toBe("nyoki-navy");
  });

  it("offers only colours approved as text on the beige the header and its menus sit on", () => {
    expect(LABEL_COLOURS.length).toBeGreaterThan(1);
    for (const colour of LABEL_COLOURS) {
      expect(hexOf.get(colour.token)).toBe(colour.hex);
      expect(onBeige).toContain(colour.hex);
    }
  });

  it("never offers sage or white, which would barely show on the beige", () => {
    const offered = LABEL_COLOURS.map((colour) => colour.token);
    for (const faint of ["nyoki-sage", "nyoki-sage-light", "nyoki-white", "nyoki-beige"]) expect(offered).not.toContain(faint);
  });

  it("knows what it offers", () => {
    expect(isLabelColour("nyoki-ink")).toBe(true);
    expect(isLabelColour("#ff0000")).toBe(false);
  });

  it("draws a colour no longer offered in navy, rather than one that may not read", () => {
    expect(labelColourHex("nyoki-sage-deep")).toBe(hexOf.get("nyoki-sage-deep"));
    expect(labelColourHex("nyoki-sage-light")).toBe(hexOf.get("nyoki-navy"));
  });
});
