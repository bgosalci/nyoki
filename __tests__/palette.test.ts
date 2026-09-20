import { AA_LARGE_TEXT, AA_TEXT, contrastRatio } from "@/lib/brand/contrast";
import {
  APPROVED_LARGE_TEXT_PAIRINGS,
  night,
  APPROVED_TEXT_PAIRINGS,
  DECORATIVE,
  brand,
  neutral,
  palette,
} from "@/lib/brand/palette";

describe("brand colours come from the logo files, not a guess", () => {
  it("sage is the only vector colour in Nyoki-logo.svg", () => {
    expect(brand.sage).toBe("#889c9d");
  });

  it("the script colour is the dominant opaque pixel of the transparent logo", () => {
    expect(brand.sageLight).toBe("#acbcbc");
  });

  it("the HANDMADE colour is the second cluster of the transparent logo", () => {
    expect(brand.navy).toBe("#4a5667");
  });

  it("ink is the moth mark's fill", () => {
    expect(brand.ink).toBe("#0b063c");
  });

  it("carries the neutrals from the existing colour-palette.css unchanged", () => {
    expect(neutral).toEqual({
      beige: "#f5f3ef",
      accentBeige: "#e9e5da",
      softAsh: "#d4ddde",
      lightSlate: "#cad3d4",
      blueGrey: "#bfc9ca",
      textDark: "#4a4a4a",
      white: "#ffffff",
    });
  });

  it("carries the night neutrals the theme board's dark mode already used", () => {
    // Ink is a saturated blue-purple and reads as blue when used as a dark
    // ground. These are the near-blacks the board itself renders in.
    expect(night).toEqual({ ground: "#171b21", panel: "#1f242c", rule: "#313842" });
  });

  it("reads light text on both night surfaces", () => {
    for (const bg of [night.ground, night.panel]) {
      expect(contrastRatio(neutral.beige, bg)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(neutral.blueGrey, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("records where every colour came from", () => {
    for (const entry of palette) {
      expect(entry.source).toMatch(/^(logo-svg|logo-pixels|moth-svg|colour-palette\.css|theme-board)$/);
      expect(entry.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("approved pairings", () => {
  it("every body-text pairing meets AA", () => {
    for (const pairing of APPROVED_TEXT_PAIRINGS) {
      const ratio = contrastRatio(pairing.text, pairing.surface);
      expect({ ...pairing, ratio: Number(ratio.toFixed(2)) }).toMatchObject({ ratio: expect.any(Number) });
      expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("every large-text pairing meets the large-text minimum", () => {
    for (const pairing of APPROVED_LARGE_TEXT_PAIRINGS) {
      expect(contrastRatio(pairing.text, pairing.surface)).toBeGreaterThanOrEqual(AA_LARGE_TEXT);
    }
  });

  it("never uses a decorative colour as text", () => {
    const textColours = [...APPROVED_TEXT_PAIRINGS, ...APPROVED_LARGE_TEXT_PAIRINGS].map((p) => p.text);
    for (const decorative of DECORATIVE) {
      expect(textColours).not.toContain(decorative);
    }
  });

  it("the logo's own script colour is decorative, not a text colour", () => {
    // 1.97:1 on white. Fine for a wordmark, illegible as copy.
    expect(DECORATIVE).toContain(brand.sageLight);
    expect(contrastRatio(brand.sageLight, neutral.white)).toBeLessThan(AA_LARGE_TEXT);
  });
});

describe("tempting pairings that do not pass", () => {
  // These are the combinations the logo itself suggests. Encoding the failure
  // is the point: it stops them being reintroduced on a button later.
  it("white on sage fails even for large text", () => {
    expect(contrastRatio(neutral.white, brand.sage)).toBeLessThan(AA_LARGE_TEXT);
    expect(APPROVED_TEXT_PAIRINGS).not.toContainEqual(expect.objectContaining({ text: neutral.white, surface: brand.sage }));
    expect(APPROVED_LARGE_TEXT_PAIRINGS).not.toContainEqual(expect.objectContaining({ text: neutral.white, surface: brand.sage }));
  });

  it("navy on sage fails", () => {
    expect(contrastRatio(brand.navy, brand.sage)).toBeLessThan(AA_LARGE_TEXT);
    expect(APPROVED_TEXT_PAIRINGS).not.toContainEqual(expect.objectContaining({ text: brand.navy, surface: brand.sage }));
  });

  it("ink is the text colour that works on sage", () => {
    expect(contrastRatio(brand.ink, brand.sage)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(APPROVED_TEXT_PAIRINGS).toContainEqual(expect.objectContaining({ text: brand.ink, surface: brand.sage }));
  });

  it("navy on the light blue-grey is large text only", () => {
    const ratio = contrastRatio(brand.navy, neutral.blueGrey);
    expect(ratio).toBeLessThan(AA_TEXT);
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_TEXT);
    expect(APPROVED_TEXT_PAIRINGS).not.toContainEqual(expect.objectContaining({ text: brand.navy, surface: neutral.blueGrey }));
    expect(APPROVED_LARGE_TEXT_PAIRINGS).toContainEqual(expect.objectContaining({ text: brand.navy, surface: neutral.blueGrey }));
  });
});
