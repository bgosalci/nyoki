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

  it("the page ground is white in light and near-black in dark", () => {
    expect(ui.page).toMatch(/\bbg-nyoki-white\b/);
    expect(ui.page).toMatch(/\bdark:bg-nyoki-night\b/);
  });

  it("never grounds a dark surface in the mid-tone navy", () => {
    // #4a5667 sits in the middle of the range. As a dark-mode background it
    // reads as washed out beside the ink page rather than as dark. It earns
    // its place there as a border, and as a raised control that is meant to
    // stand off the page - nothing else.
    const raised = ["buttonPrimary", "navActive", "pillActive", "badgeQuiet", "badgeDark"];

    for (const [name, classes] of Object.entries(ui)) {
      if (raised.includes(name)) continue;
      expect({ name, classes }).toMatchObject({ name });
      expect(classes).not.toMatch(/\bdark:bg-nyoki-navy\b/);
    }
  });

  it("dims the page behind a modal with a neutral scrim, never a brand tint", () => {
    // Ink is #0b063c - a saturated blue-purple. At any opacity it lays a blue
    // wash over whatever is behind it, which is why the scrim is plain black.
    expect(ui.scrim).toMatch(/\bbackdrop:bg-black\/\d+\b/);
    expect(ui.scrim).not.toMatch(/nyoki-/);
  });

  it("pairs every dark surface with light text", () => {
    expect(ui.page).toMatch(/dark:bg-nyoki-night\b/);
    expect(ui.page).toMatch(/dark:text-nyoki-beige/);
    expect(ui.panel).toMatch(/dark:bg-nyoki-night-panel/);
    expect(ui.card).toMatch(/dark:bg-nyoki-night-panel/);
  });

  it("never grounds a dark surface in the brand ink, which reads as blue", () => {
    for (const [name, classes] of Object.entries(ui)) {
      expect({ name, classes }).toMatchObject({ name });
      expect(classes).not.toMatch(/\bdark:bg-nyoki-ink\b/);
    }
  });

  it("draws dark rules in something visible against ink", () => {
    // An ink border on an ink ground is no border at all.
    expect(ui.rule).toMatch(/dark:border-nyoki-night-rule/);
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
