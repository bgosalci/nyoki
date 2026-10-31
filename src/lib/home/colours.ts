import { contrastRatio } from "@/lib/brand/contrast";
import { APPROVED_LARGE_TEXT_PAIRINGS, APPROVED_TEXT_PAIRINGS, DECORATIVE, palette } from "@/lib/brand/palette";
import { ui } from "@/lib/brand/ui";

/**
 * The colours the home page's banner and tiles can be set to.
 *
 * Only the brand's own, by token, and words only in a colour that reads on
 * what they sit on: the banner's from the approved pairings (its words are
 * always large, so the large-text pairings count too), a tile's by the fade
 * laid over its photo. A free colour picker would let white onto sage.
 */

export interface Swatch {
  token: string;
  name: string;
  hex: string;
}

/** Every brand colour but the page's beige, which would leave no band to see. */
const GROUNDS = [
  "nyoki-sage",
  "nyoki-sage-light",
  "nyoki-navy",
  "nyoki-ink",
  "nyoki-accent-beige",
  "nyoki-soft-ash",
  "nyoki-blue-grey",
  "nyoki-white",
] as const;

export const DEFAULT_BANNER = { ground: "nyoki-sage", ink: "nyoki-ink" } as const;

const PAIRINGS = new Set([...APPROVED_TEXT_PAIRINGS, ...APPROVED_LARGE_TEXT_PAIRINGS].map((p) => `${p.text} on ${p.surface}`));

function swatch(token: string): Swatch | undefined {
  const entry = palette.find((candidate) => candidate.token === token);
  return entry ? { token: entry.token, name: entry.name, hex: entry.hex } : undefined;
}

export function bannerGrounds(): Swatch[] {
  return GROUNDS.map((token) => swatch(token)!);
}

/** The words that read on `ground`, the clearest first. */
export function bannerInks(ground: string): Swatch[] {
  const surface = swatch(ground);
  if (!surface || !(GROUNDS as readonly string[]).includes(ground)) return [];
  return palette
    .filter((entry) => !DECORATIVE.includes(entry.hex) && PAIRINGS.has(`${entry.hex} on ${surface.hex}`))
    .map((entry) => ({ token: entry.token, name: entry.name, hex: entry.hex }))
    .sort((a, b) => contrastRatio(b.hex, surface.hex) - contrastRatio(a.hex, surface.hex));
}

export function readsOn(ground: string, ink: string): boolean {
  return bannerInks(ground).some((candidate) => candidate.token === ink);
}

/** The words to keep on a new ground: the same, if they read there, else the first that does. */
export function inkFor(ground: string, current: string): string {
  return readsOn(ground, current) ? current : (bannerInks(ground)[0]?.token ?? DEFAULT_BANNER.ink);
}

/** The banner's colours, or the design's for a pair that no longer reads. */
export function bannerStyle(ground: string, ink: string): { backgroundColor: string; color: string } {
  const [g, i] = readsOn(ground, ink) ? [ground, ink] : [DEFAULT_BANNER.ground, DEFAULT_BANNER.ink];
  return { backgroundColor: swatch(g)!.hex, color: swatch(i)!.hex };
}

export interface TileWordsOption {
  token: string;
  name: string;
  /** What is laid over the photo beneath them: dark for light words, light for dark. */
  fade: "dark" | "light";
  label: string;
}

/** Light words for a dark photo, dark words for a pale one. */
export const TILE_WORDS: readonly TileWordsOption[] = [
  { token: "nyoki-white", name: "White", fade: "dark", label: ui.shopTileLabel },
  { token: "nyoki-beige", name: "Beige", fade: "dark", label: ui.shopTileLabelBeige },
  { token: "nyoki-navy", name: "Navy", fade: "light", label: ui.shopTileLabelNavy },
  { token: "nyoki-ink", name: "Ink", fade: "light", label: ui.shopTileLabelInk },
];

export const DEFAULT_TILE_WORDS = "nyoki-white";

export function isTileWords(token: string): boolean {
  return TILE_WORDS.some((option) => option.token === token);
}

/** The classes a tile's words and fade are drawn in; white for a colour no longer offered. */
export function tileWords(token: string): { label: string; fade: string } {
  const option = TILE_WORDS.find((candidate) => candidate.token === token) ?? TILE_WORDS[0];
  return { label: option.label, fade: option.fade === "dark" ? ui.shopTileFade : ui.shopTileFadeLight };
}

export function tileWordSwatches(): Swatch[] {
  return TILE_WORDS.map((option) => swatch(option.token)!);
}
