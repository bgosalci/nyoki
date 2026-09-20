/**
 * The Nyoki palette. Every value is traceable to a file in the brand folder:
 * the four brand colours were read from the logo files, the neutrals are the
 * existing colour-palette.css unchanged.
 *
 * The approved pairings below are the only text/surface combinations the site
 * uses. The palette tests check each one against WCAG AA, and check that the
 * tempting combinations the logo suggests - white on sage, navy on sage - are
 * NOT on the list, because they fail.
 */

export const brand = {
  /** Background of Nyoki-logo.svg: the one vector colour in the file. */
  sage: "#889c9d",
  /** The "Nyoki" script: dominant opaque pixel of the transparent logo. */
  sageLight: "#acbcbc",
  /** The "HANDMADE" caps. */
  navy: "#4a5667",
  /** Fill of moth.svg, the secondary mark. */
  ink: "#0b063c",
} as const;

export const neutral = {
  beige: "#f5f3ef",
  accentBeige: "#e9e5da",
  softAsh: "#d4ddde",
  lightSlate: "#cad3d4",
  blueGrey: "#bfc9ca",
  textDark: "#4a4a4a",
  white: "#ffffff",
} as const;

/**
 * Dark-mode neutrals. Not drawn from the logo - the brand has no dark ground -
 * but the near-blacks the theme board's own dark mode renders in. The brand
 * ink is a saturated blue-purple and reads as blue when used as a ground.
 */
export const night = {
  ground: "#171b21",
  panel: "#1f242c",
  rule: "#313842",
} as const;

export type PaletteSource = "logo-svg" | "logo-pixels" | "moth-svg" | "colour-palette.css" | "theme-board";

export type PaletteRole = "brand" | "text" | "surface" | "decorative";

export interface PaletteEntry {
  name: string;
  /** The Tailwind token, usable as bg-<token>, text-<token>, border-<token>. */
  token: string;
  hex: string;
  role: PaletteRole;
  source: PaletteSource;
  note: string;
}

export const palette: readonly PaletteEntry[] = [
  { name: "Sage", token: "nyoki-sage", hex: brand.sage, role: "brand", source: "logo-svg", note: "The brand colour. A surface for ink text or the white logo, never for small text of its own." },
  { name: "Sage light", token: "nyoki-sage-light", hex: brand.sageLight, role: "decorative", source: "logo-pixels", note: "The script in the wordmark. Decorative only - never copy." },
  { name: "Navy", token: "nyoki-navy", hex: brand.navy, role: "text", source: "logo-pixels", note: "HANDMADE. The working text and button colour on every light surface." },
  { name: "Ink", token: "nyoki-ink", hex: brand.ink, role: "text", source: "moth-svg", note: "The moth. The one text colour that reads on sage." },
  { name: "Beige", token: "nyoki-beige", hex: neutral.beige, role: "surface", source: "colour-palette.css", note: "Page background." },
  { name: "Accent beige", token: "nyoki-accent-beige", hex: neutral.accentBeige, role: "surface", source: "colour-palette.css", note: "Cards and panels on the beige page." },
  { name: "Soft ash", token: "nyoki-soft-ash", hex: neutral.softAsh, role: "surface", source: "colour-palette.css", note: "Image placeholders, quiet fills." },
  { name: "Light slate", token: "nyoki-light-slate", hex: neutral.lightSlate, role: "surface", source: "colour-palette.css", note: "Borders and dividers." },
  { name: "Blue grey", token: "nyoki-blue-grey", hex: neutral.blueGrey, role: "surface", source: "colour-palette.css", note: "Strong surface. Navy on it is large text only." },
  { name: "Text dark", token: "nyoki-text-dark", hex: neutral.textDark, role: "text", source: "colour-palette.css", note: "Body copy where navy would feel too cool." },
  { name: "White", token: "nyoki-white", hex: neutral.white, role: "surface", source: "colour-palette.css", note: "Product photography ground." },
  { name: "Night", token: "nyoki-night", hex: night.ground, role: "surface", source: "theme-board", note: "Dark-mode page ground." },
  { name: "Night panel", token: "nyoki-night-panel", hex: night.panel, role: "surface", source: "theme-board", note: "Dark-mode panels and cards." },
  { name: "Night rule", token: "nyoki-night-rule", hex: night.rule, role: "surface", source: "theme-board", note: "Dark-mode borders and lifted controls." },
];

/** Colours that may decorate but never carry text. */
export const DECORATIVE: readonly string[] = [brand.sageLight];

export interface Pairing {
  text: string;
  surface: string;
  use: string;
}

/** Text on surface combinations that meet WCAG AA for body text (4.5:1). */
export const APPROVED_TEXT_PAIRINGS: readonly Pairing[] = [
  { text: brand.navy, surface: neutral.white, use: "Product names and copy on white" },
  { text: brand.navy, surface: neutral.beige, use: "Copy on the page background" },
  { text: brand.navy, surface: neutral.accentBeige, use: "Copy on cards" },
  { text: brand.navy, surface: neutral.softAsh, use: "Captions on placeholders" },
  { text: brand.navy, surface: neutral.lightSlate, use: "Labels on dividers" },
  { text: neutral.textDark, surface: neutral.white, use: "Long-form copy" },
  { text: neutral.textDark, surface: neutral.beige, use: "Long-form copy" },
  { text: neutral.textDark, surface: neutral.accentBeige, use: "Long-form copy on cards" },
  { text: neutral.textDark, surface: neutral.softAsh, use: "Small print" },
  { text: neutral.textDark, surface: neutral.lightSlate, use: "Small print" },
  { text: neutral.textDark, surface: neutral.blueGrey, use: "Small print on strong surfaces" },
  { text: brand.ink, surface: brand.sage, use: "Text on a sage band or badge" },
  { text: brand.ink, surface: brand.sageLight, use: "Text on a sage-light band" },
  { text: brand.ink, surface: neutral.beige, use: "Headlines" },
  { text: brand.ink, surface: neutral.white, use: "Headlines" },
  { text: brand.ink, surface: neutral.accentBeige, use: "Headlines on a quiet band" },
  { text: neutral.white, surface: brand.navy, use: "Primary button" },
  { text: neutral.white, surface: brand.ink, use: "Footer, dark bands" },
  { text: neutral.beige, surface: brand.navy, use: "Primary button, warmer" },
  { text: neutral.beige, surface: brand.ink, use: "Footer copy" },
  { text: neutral.beige, surface: night.ground, use: "Text on the dark page" },
  { text: neutral.blueGrey, surface: night.ground, use: "Muted text on the dark page" },
  { text: neutral.beige, surface: night.panel, use: "Text on a dark panel" },
  { text: neutral.blueGrey, surface: night.panel, use: "Muted text on a dark panel" },
  { text: neutral.beige, surface: night.rule, use: "Text on a lifted dark control" },
  { text: neutral.accentBeige, surface: brand.navy, use: "Secondary text on a navy panel" },
  { text: neutral.accentBeige, surface: brand.ink, use: "Secondary text on a dark band" },
  { text: neutral.blueGrey, surface: brand.ink, use: "Muted text on the dark page" },
];

/** Combinations that pass only the large-text minimum (3:1): headings, tags, badges. */
export const APPROVED_LARGE_TEXT_PAIRINGS: readonly Pairing[] = [
  { text: brand.navy, surface: neutral.blueGrey, use: "Section headings on a blue-grey band" },
  { text: brand.navy, surface: brand.sageLight, use: "Large heading on a sage-light band" },
];
