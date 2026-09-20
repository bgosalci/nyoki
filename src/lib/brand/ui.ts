import { brand, neutral } from "@/lib/brand/palette";

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
    dark: { bg: brand.ink, text: neutral.beige, muted: neutral.blueGrey },
  },
  panel: {
    light: { bg: neutral.white, text: brand.navy, muted: neutral.textDark },
    dark: { bg: brand.navy, text: neutral.beige, muted: neutral.accentBeige },
  },
  card: {
    light: { bg: neutral.accentBeige, text: brand.navy, muted: neutral.textDark },
    dark: { bg: brand.navy, text: neutral.beige, muted: neutral.accentBeige },
  },
  band: {
    light: { bg: brand.sage, text: brand.ink, muted: brand.ink },
    dark: { bg: brand.sage, text: brand.ink, muted: brand.ink },
  },
  primary: {
    light: { bg: brand.navy, text: neutral.beige, muted: neutral.beige },
    dark: { bg: neutral.beige, text: brand.navy, muted: neutral.textDark },
  },
};

/** Tailwind class recipes. Every token here is checked to exist by the brand tests. */
export const ui = {
  page: "bg-nyoki-white text-nyoki-navy dark:bg-nyoki-ink dark:text-nyoki-beige",
  panel: "bg-nyoki-white text-nyoki-navy dark:bg-nyoki-navy dark:text-nyoki-beige",
  card: "bg-nyoki-accent-beige text-nyoki-navy dark:bg-nyoki-navy dark:text-nyoki-beige",
  mutedOnPage: "text-nyoki-text-dark dark:text-nyoki-blue-grey",
  mutedOnPanel: "text-nyoki-text-dark dark:text-nyoki-accent-beige",
  heading: "text-nyoki-ink dark:text-nyoki-beige",
  rule: "border-nyoki-light-slate dark:border-nyoki-ink",
  ruleOnPage: "border-nyoki-light-slate dark:border-nyoki-navy",
  link: "text-nyoki-navy underline underline-offset-4 dark:text-nyoki-beige",
  navItem:
    "text-nyoki-text-dark hover:bg-nyoki-beige dark:text-nyoki-accent-beige dark:hover:bg-nyoki-ink",
  navActive: "bg-nyoki-accent-beige text-nyoki-navy font-medium dark:bg-nyoki-ink dark:text-nyoki-beige",
  buttonPrimary:
    "bg-nyoki-navy text-nyoki-beige hover:opacity-90 disabled:opacity-60 dark:bg-nyoki-beige dark:text-nyoki-navy",
  buttonSecondary:
    "border border-nyoki-navy text-nyoki-navy hover:bg-nyoki-accent-beige dark:border-nyoki-beige dark:text-nyoki-beige dark:hover:bg-nyoki-ink",
  input:
    "bg-nyoki-white text-nyoki-navy border-nyoki-light-slate focus:border-nyoki-navy dark:bg-nyoki-ink dark:text-nyoki-beige dark:border-nyoki-navy dark:focus:border-nyoki-beige",
  badgeSale: "bg-nyoki-sage text-nyoki-ink",
  badgeQuiet: "bg-nyoki-accent-beige text-nyoki-navy dark:bg-nyoki-ink dark:text-nyoki-beige",
  badgeDark: "bg-nyoki-ink text-nyoki-beige dark:bg-nyoki-beige dark:text-nyoki-ink",
  tableHead: "border-nyoki-light-slate dark:border-nyoki-navy",
  pill: "border border-nyoki-light-slate bg-nyoki-white text-nyoki-navy hover:border-nyoki-navy dark:border-nyoki-navy dark:bg-nyoki-navy dark:text-nyoki-beige dark:hover:border-nyoki-beige",
  pillActive: "border border-nyoki-navy bg-nyoki-navy text-nyoki-beige dark:border-nyoki-beige dark:bg-nyoki-beige dark:text-nyoki-navy",
  tableRow: "border-nyoki-accent-beige dark:border-nyoki-navy",
} as const;
