"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  THEME_CHOICES,
  THEME_LABELS,
  THEME_STORAGE_KEY,
  themeAttribute,
  themeChoiceFrom,
  type ThemeChoice,
} from "@/lib/admin/theme";
import { ui } from "@/lib/brand/ui";

/** Sun, moon, and a half-lit circle for whatever the machine is set to. */
const ICONS: Record<ThemeChoice, React.ReactNode> = {
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" strokeLinecap="round" />
    </>
  ),
  dark: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" strokeLinejoin="round" />,
  system: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
    </>
  ),
};

/**
 * The preference is external state React does not own, so it is read through
 * useSyncExternalStore rather than copied into state by an effect.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) ?? "";
  } catch {
    // Private windows and blocked site data both throw. Follow the machine.
    return "";
  }
}

/** The server cannot know this browser's choice, so it renders the system one. */
function getServerSnapshot(): string {
  return "";
}

function choose(value: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Not remembering is a smaller problem than not switching.
  }
  for (const listener of listeners) listener();
}

/**
 * Light, dark, or whatever the machine is set to.
 *
 * All three are one click rather than a control that cycles, so the choice on
 * offer is visible instead of having to be discovered. Choosing outright
 * marks the page with `data-theme`, which the stylesheet lets win over the
 * media query; following the system takes the mark off and leaves the
 * decision to CSS, where it costs nothing and cannot flash.
 */
export function ThemeToggle() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const choice = themeChoiceFrom(raw.length > 0 ? raw : null);

  useEffect(() => {
    const root = document.documentElement;
    const attribute = themeAttribute(choice);

    if (attribute) root.dataset.theme = attribute;
    else delete root.dataset.theme;

    // Taken off on the way out: the storefront is light-only, and a
    // client-side navigation out of the admin would otherwise carry the
    // dark mark onto it.
    return () => {
      delete root.dataset.theme;
    };
  }, [choice]);

  return (
    <div role="group" aria-label="Theme" className={`flex items-center gap-0.5 rounded-md border p-0.5 ${ui.rule}`}>
      {THEME_CHOICES.map((value) => {
        const current = value === choice;

        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={current}
            aria-label={THEME_LABELS[value]}
            title={THEME_LABELS[value]}
            className={`rounded p-1.5 ${current ? ui.navActive : ui.navItem}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-4">
              {ICONS[value]}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
