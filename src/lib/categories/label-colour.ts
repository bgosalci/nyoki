import { contrastRatio } from "@/lib/brand/contrast";
import { APPROVED_TEXT_PAIRINGS, DECORATIVE, neutral, palette } from "@/lib/brand/palette";
import type { Swatch } from "@/lib/home/colours";

/**
 * The colour a category's name takes in the shop's header - the department
 * row, and the drop-down menus beneath it. Both sit on the page's beige, so
 * the colours offered are the ones approved as text on it: navy, as every
 * name was, then the rest, the clearest first.
 */

export const DEFAULT_LABEL_COLOUR = "nyoki-navy";

const ON_BEIGE = new Set(APPROVED_TEXT_PAIRINGS.filter((pairing) => pairing.surface === neutral.beige).map((pairing) => pairing.text));

export const LABEL_COLOURS: readonly Swatch[] = palette
  .filter((entry) => ON_BEIGE.has(entry.hex) && !DECORATIVE.includes(entry.hex))
  .map((entry) => ({ token: entry.token, name: entry.name, hex: entry.hex }))
  .sort(
    (a, b) =>
      Number(b.token === DEFAULT_LABEL_COLOUR) - Number(a.token === DEFAULT_LABEL_COLOUR) ||
      contrastRatio(b.hex, neutral.beige) - contrastRatio(a.hex, neutral.beige),
  );

export function isLabelColour(token: string): boolean {
  return LABEL_COLOURS.some((colour) => colour.token === token);
}

/** The colour to draw a name in; navy for one no longer offered. */
export function labelColourHex(token: string | undefined): string {
  const colour = LABEL_COLOURS.find((candidate) => candidate.token === token) ?? LABEL_COLOURS[0];
  return colour.hex;
}
