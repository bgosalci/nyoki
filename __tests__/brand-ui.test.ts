import { AA_TEXT, contrastRatio } from "@/lib/brand/contrast";
import { APPROVED_TEXT_PAIRINGS, palette } from "@/lib/brand/palette";
import { surfaces, ui } from "@/lib/brand/ui";

const hexOfToken = new Map(palette.map((entry) => [entry.token, entry.hex]));
const approved = new Set(APPROVED_TEXT_PAIRINGS.map((p) => `${p.text} on ${p.surface}`));

describe("CMS surfaces", () => {
  it.each(Object.entries(surfaces))("%s puts its text in an approved pairing in both themes", (_name, surface) => {
    for (const theme of ["light", "dark"] as const) {
      const { bg, text, muted } = surface[theme];
      expect(approved).toContain(`${text} on ${bg}`);
      expect(approved).toContain(`${muted} on ${bg}`);
      expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe("CMS class recipes", () => {
  it("every recipe references only brand tokens that exist", () => {
    for (const [name, classes] of Object.entries(ui)) {
      const tokens = [...classes.matchAll(/(?:bg|text|border)-(nyoki-[a-z-]+)/g)].map((m) => m[1]);
      expect({ name, tokens }).toMatchObject({ tokens: expect.any(Array) });
      for (const token of tokens) {
        expect(hexOfToken.has(token)).toBe(true);
      }
    }
  });

  it("the primary button is beige on navy, and its dark variant too", () => {
    expect(ui.buttonPrimary).toMatch(/\bbg-nyoki-navy\b/);
    expect(ui.buttonPrimary).toMatch(/\btext-nyoki-beige\b/);
  });

  it("the page ground is white in light and ink in dark", () => {
    expect(ui.page).toMatch(/\bbg-nyoki-white\b/);
    expect(ui.page).toMatch(/\bdark:bg-nyoki-ink\b/);
  });

  it("nothing ever puts white or navy text on sage", () => {
    for (const classes of Object.values(ui)) {
      const onSage = /\bbg-nyoki-sage\b/.test(classes);
      if (!onSage) continue;
      expect(classes).not.toMatch(/\btext-nyoki-white\b/);
      expect(classes).not.toMatch(/\btext-nyoki-navy\b/);
    }
  });
});
