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

  it("deepens sage just far enough to read as small text on the page", () => {
    // The logo's own sage, every channel scaled by one factor - so the same
    // colour, darker - and the lightest such shade that meets AA on beige.
    const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const scaled = (factor: number) =>
      `#${channels(brand.sage).map((c) => Math.round(c * factor).toString(16).padStart(2, "0")).join("")}`;
    const factors = Array.from({ length: 70 }, (_, i) => 1 - i / 100);
    const lightestReadable = factors.map(scaled).find((hex) => contrastRatio(hex, neutral.beige) >= AA_TEXT);

    expect(brand.sageDeep).toBe(lightestReadable);
    expect(brand.sageDeep).toBe("#637273");
  });

  it("turns the logo's sage to the far side of the wheel for its red: half saturated, and as dark as navy", () => {
    // A red to sit with the palette rather than shout over it: sage's
    // complement, muted to half saturation, at navy's lightness so a name in
    // red weighs the same as the navy names beside it.
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const hueAndLightness = (hex: string) => {
      const [r, g, b] = rgb(hex);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      const hue = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return { hue: (hue * 60 + 360) % 360, lightness: (max + min) / 2 };
    };
    const fromHsl = (hue: number, saturation: number, lightness: number) => {
      const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      const m = lightness - c / 2;
      const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
      return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
    };

    const red = fromHsl((hueAndLightness(brand.sage).hue + 180) % 360, 0.5, hueAndLightness(brand.navy).lightness);

    expect(brand.red).toBe(red);
    expect(brand.red).toBe("#85302c");
  });

  it("makes the switch's green as vivid as a green can be and still be seen as a control", () => {
    // Fully saturated, at the lightest shade that stands 3:1 off the white
    // page and from the white knob on it. Hue 145 is an emerald: pure green
    // (120) reads as a warning light.
    const fromHsl = (hue: number, saturation: number, lightness: number) => {
      const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
      const m = lightness - c / 2;
      const [r, g, b] = hue < 120 ? [x, c, 0] : [0, c, x];
      return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
    };
    const percents = Array.from({ length: 50 }, (_, i) => (50 - i) / 100);
    const lightestSeen = percents.map((l) => fromHsl(145, 1, l)).find((hex) => contrastRatio(hex, neutral.white) >= AA_LARGE_TEXT);

    expect(brand.green).toBe(lightestSeen);
    expect(brand.green).toBe("#00a846");
    expect(contrastRatio(brand.green, night.ground)).toBeGreaterThanOrEqual(AA_LARGE_TEXT);
  });

  it("never sets words in the switch's green: 3:1 is enough for a control, not for text", () => {
    expect(DECORATIVE).toContain(brand.green);
  });

  it("records where every colour came from", () => {
    for (const entry of palette) {
      expect(entry.source).toMatch(/^(logo-svg|logo-pixels|moth-svg|colour-palette\.css|theme-board|derived)$/);
      expect(entry.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("approved pairings", () => {
  it("reads the red on the page, for a department's name in the header", () => {
    const pairs = APPROVED_TEXT_PAIRINGS.map((p) => `${p.text} on ${p.surface}`);

    expect(pairs).toContain(`${brand.red} on ${neutral.beige}`);
  });

  it("reads deep sage on white as well as on the page, for a pack's saving on a chosen tile", () => {
    const pairs = APPROVED_TEXT_PAIRINGS.map((p) => `${p.text} on ${p.surface}`);

    expect(pairs).toContain(`${brand.sageDeep} on ${neutral.beige}`);
    expect(pairs).toContain(`${brand.sageDeep} on ${neutral.white}`);
  });

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
