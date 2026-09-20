/**
 * Light, dark, or whatever the machine is set to.
 *
 * The third choice is the important one: following the system needs no
 * JavaScript at all, because it is what the stylesheet's
 * prefers-color-scheme query already answers. An outright choice marks the
 * page with `data-theme`, and the stylesheet lets that attribute win.
 */

export const THEME_CHOICES = ["light", "dark", "system"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "nyoki-admin-theme";

export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/** What was stored, or following the system if it was nothing we recognise. */
export function themeChoiceFrom(raw: string | null): ThemeChoice {
  return THEME_CHOICES.includes(raw as ThemeChoice) ? (raw as ThemeChoice) : "system";
}

/** The theme actually in force, given what the browser prefers. */
export function resolvedTheme(choice: ThemeChoice, prefersDark: boolean): Theme {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return choice;
}

/**
 * The value for the page's `data-theme`, or null to take it off.
 *
 * Absence is meaningful: with no attribute the stylesheet's media query
 * decides, which is exactly what following the system means.
 */
export function themeAttribute(choice: ThemeChoice): Theme | null {
  return choice === "system" ? null : choice;
}

/**
 * The script that runs inline, ahead of React, so a chosen theme is already
 * on the page at first paint rather than snapping into place after it.
 *
 * Deliberately tiny and dependency-free - it is inlined into the HTML as a
 * string - and it stays silent when storage is unreadable, which a private
 * window or blocked site data will make it.
 */
export const THEME_BOOTSTRAP = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}`;
