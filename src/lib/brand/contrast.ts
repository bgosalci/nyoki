/**
 * WCAG 2.x contrast, used to decide which colour pairings the site may put
 * text in. The palette tests enforce these numbers, so a pairing that fails
 * cannot quietly become a button later.
 */

/** Minimum contrast for body text (WCAG AA). */
export const AA_TEXT = 4.5;

/** Minimum for large text (18pt+, or 14pt bold) and UI components. */
export const AA_LARGE_TEXT = 3;

export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Not a hex colour: ${hex}`);

  let digits = match[1];
  if (digits.length === 3) {
    digits = digits.split("").map((d) => d + d).join("");
  }

  return [0, 2, 4].map((i) => Number.parseInt(digits.slice(i, i + 2), 16)) as [number, number, number];
}

/** sRGB channel (0-255) to linear light, per the WCAG definition. */
function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Contrast ratio between two colours, 1 to 21, independent of order. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}
