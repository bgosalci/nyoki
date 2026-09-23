import { brand, neutral, night } from "@/lib/brand/palette";

/**
 * The CMS's colour recipes, in one place so the brand tests can check every
 * combination against the approved pairings. Components use these strings
 * rather than picking tokens ad hoc.
 */

export interface SurfaceColours {
  bg: string;
  text: string;
  muted: string;
}

export interface Surface {
  light: SurfaceColours;
  dark: SurfaceColours;
}

/** Each named surface with the text colours that may sit on it, per theme. */
export const surfaces: Record<string, Surface> = {
  page: {
    light: { bg: neutral.white, text: brand.navy, muted: neutral.textDark },
    dark: { bg: night.ground, text: neutral.beige, muted: neutral.blueGrey },
  },
  panel: {
    light: { bg: neutral.white, text: brand.navy, muted: neutral.textDark },
    dark: { bg: night.panel, text: neutral.beige, muted: neutral.blueGrey },
  },
  card: {
    light: { bg: neutral.accentBeige, text: brand.navy, muted: neutral.textDark },
    dark: { bg: night.panel, text: neutral.beige, muted: neutral.blueGrey },
  },
  band: {
    light: { bg: brand.sage, text: brand.ink, muted: brand.ink },
    dark: { bg: brand.sage, text: brand.ink, muted: brand.ink },
  },
  primary: {
    light: { bg: brand.navy, text: neutral.beige, muted: neutral.beige },
    dark: { bg: brand.navy, text: neutral.beige, muted: neutral.beige },
  },
};

/** Tailwind class recipes. Every token here is checked to exist by the brand tests. */
export const ui = {
  page: "bg-nyoki-white text-nyoki-navy dark:bg-nyoki-night dark:text-nyoki-beige",
  panel: "bg-nyoki-white text-nyoki-navy dark:bg-nyoki-night-panel dark:text-nyoki-beige",
  card: "bg-nyoki-accent-beige text-nyoki-navy dark:bg-nyoki-night-panel dark:text-nyoki-beige",
  mutedOnPage: "text-nyoki-text-dark dark:text-nyoki-blue-grey",
  mutedOnPanel: "text-nyoki-text-dark dark:text-nyoki-blue-grey",
  heading: "text-nyoki-ink dark:text-nyoki-beige",
  rule: "border-nyoki-light-slate dark:border-nyoki-night-rule",
  ruleOnPage: "border-nyoki-light-slate dark:border-nyoki-night-rule",
  link: "text-nyoki-navy underline underline-offset-4 dark:text-nyoki-beige",
  navItem:
    "text-nyoki-text-dark hover:bg-nyoki-beige dark:text-nyoki-blue-grey dark:hover:bg-nyoki-night-rule",
  navActive: "bg-nyoki-accent-beige text-nyoki-navy font-medium dark:bg-nyoki-night-rule dark:text-nyoki-beige",
  buttonPrimary:
    "bg-nyoki-navy text-nyoki-beige hover:opacity-90 disabled:opacity-60 dark:bg-nyoki-navy dark:text-nyoki-beige",
  buttonSecondary:
    "border border-nyoki-navy text-nyoki-navy hover:bg-nyoki-accent-beige dark:border-nyoki-night-rule dark:text-nyoki-beige dark:hover:bg-nyoki-night-rule",
  input:
    "bg-nyoki-white text-nyoki-navy border-nyoki-light-slate focus:border-nyoki-navy dark:bg-nyoki-night dark:text-nyoki-beige dark:border-nyoki-night-rule dark:focus:border-nyoki-beige",
  badgeSale: "bg-nyoki-sage text-nyoki-ink",
  badgeQuiet: "bg-nyoki-accent-beige text-nyoki-navy dark:bg-nyoki-night-rule dark:text-nyoki-beige",
  badgeDark: "bg-nyoki-ink text-nyoki-beige dark:bg-nyoki-night-rule dark:text-nyoki-beige",
  tableHead: "border-nyoki-light-slate dark:border-nyoki-night-rule",
  // The dim behind a modal. Plain black, because every brand colour we have is
  // a tint: ink especially (#0b063c) lays a blue-purple wash over the page.
  scrim: "backdrop:bg-black/50",
  // The browser draws the box itself (see color-scheme in globals.css); this
  // is only the fill of the tick.
  checkbox: "accent-nyoki-navy",
  // --- storefront. Deliberately light-only: the shop commits to one warm
  // look, where the admin is a tool that follows the viewer's theme. Radii
  // come from the theme board: cards 8px, buttons 4px, tags 3px, bands 6px.
  shopPage: "bg-nyoki-beige text-nyoki-navy",
  shopSurface: "bg-nyoki-white text-nyoki-navy",
  shopHeading: "text-nyoki-ink",
  shopMuted: "text-nyoki-text-dark",
  shopRule: "border-nyoki-light-slate",
  shopButton: "rounded bg-nyoki-navy text-nyoki-beige hover:opacity-90",
  shopButtonOutline: "rounded border border-nyoki-navy text-nyoki-navy hover:bg-nyoki-accent-beige",
  shopBand: "rounded-md bg-nyoki-sage text-nyoki-ink",
  // The softer of the two bands. A category page opens on one, and sage on
  // every one of them would shout; this sits a shade off the page ground.
  shopBandQuiet: "bg-nyoki-accent-beige text-nyoki-navy",
  shopBadge: "rounded-[3px] bg-nyoki-accent-beige text-nyoki-navy",
  // The three product badges, as drawn on the theme board.
  shopBadgeSale: "rounded-[3px] bg-nyoki-sage text-nyoki-ink",
  shopBadgeMade: "rounded-[3px] bg-nyoki-accent-beige text-nyoki-navy",
  shopBadgeOne: "rounded-[3px] bg-nyoki-ink text-nyoki-beige",
  shopCard: "overflow-hidden rounded-lg border border-nyoki-light-slate bg-nyoki-white",
  pill: "border border-nyoki-light-slate bg-nyoki-white text-nyoki-navy hover:border-nyoki-navy dark:border-nyoki-night-rule dark:bg-nyoki-night dark:text-nyoki-blue-grey dark:hover:border-nyoki-beige dark:hover:text-nyoki-beige",
  pillActive: "border border-nyoki-navy bg-nyoki-navy text-nyoki-beige dark:border-nyoki-navy dark:bg-nyoki-navy dark:text-nyoki-beige",
  // Six tables share this, hover included: a row that does not answer the
  // pointer leaves you counting columns to be sure which one you are on.
  tableRow:
    "border-nyoki-accent-beige hover:bg-nyoki-beige dark:border-nyoki-night-rule dark:hover:bg-nyoki-night-panel",
} as const;
