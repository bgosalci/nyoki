import {
  AA_LARGE_TEXT,
  AA_TEXT,
  contrastRatio,
  hexToRgb,
  relativeLuminance,
} from "@/lib/brand/contrast";

describe("hexToRgb", () => {
  it("parses six-digit hex", () => {
    expect(hexToRgb("#889c9d")).toEqual([136, 156, 157]);
  });

  it("parses three-digit shorthand", () => {
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#abc")).toEqual([170, 187, 204]);
  });

  it("is case-insensitive", () => {
    expect(hexToRgb("#4A5667")).toEqual(hexToRgb("#4a5667"));
  });

  it("rejects anything that is not a hex colour", () => {
    expect(() => hexToRgb("889c9d")).toThrow(/hex/i);
    expect(() => hexToRgb("#889c9")).toThrow(/hex/i);
    expect(() => hexToRgb("#gggggg")).toThrow(/hex/i);
  });
});

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 10);
  });

  it("linearises sRGB rather than treating it as linear", () => {
    // 50% grey in sRGB is ~21.6% luminance, not 50%. Getting this wrong
    // inflates every contrast ratio for mid-tones.
    expect(relativeLuminance("#808080")).toBeCloseTo(0.2159, 3);
  });
});

describe("contrastRatio", () => {
  it("is 21:1 between black and white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("does not depend on argument order", () => {
    expect(contrastRatio("#4a5667", "#f5f3ef")).toBeCloseTo(contrastRatio("#f5f3ef", "#4a5667"), 10);
  });

  it("is 1:1 for identical colours", () => {
    expect(contrastRatio("#889c9d", "#889c9d")).toBe(1);
  });

  it("matches the published WCAG boundary example", () => {
    // #767676 on white is the canonical "just passes AA" grey at 4.54:1;
    // #777777 just fails at 4.48:1.
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });
});

describe("thresholds", () => {
  it("uses the WCAG AA minimums", () => {
    expect(AA_TEXT).toBe(4.5);
    expect(AA_LARGE_TEXT).toBe(3);
  });
});
