import { useEffect, type RefObject } from "react";

/**
 * After a save the server turned down, goes to the first thing it named:
 * focus on the first field marked invalid, in page order, and that field in
 * the middle of the screen - clear of a sticky header above it and a sticky
 * bar below, as the product page's customiser goes to the first missing
 * choice.
 *
 * Without it the errors arrive wherever they are on the page, often far out
 * of sight: Continue pressed in a phone's bottom bar, or Save at the top of
 * a long form, looked to have done nothing at all.
 *
 * A field is marked as `Field` and `ShopField` mark it, `aria-invalid`; a
 * group whose error belongs to the whole of it - a list of colours - carries
 * `data-invalid`, and the first thing in it that takes focus is gone to. A
 * field out of sight (in a closed `<details>`, or the copy a phone hides) is
 * passed over where the browser can say so.
 */

const INVALID = '[aria-invalid="true"], [data-invalid]';
const FOCUSABLE = 'input:not([type="hidden"]), select, textarea, button, [contenteditable="true"], [tabindex]';

/** The element focused, or null when nothing was marked and there was no fallback. */
export function focusFirstError(root: ParentNode, fallback?: HTMLElement | null): HTMLElement | null {
  const marked = Array.from(root.querySelectorAll<HTMLElement>(INVALID)).find(shown);
  const target = marked ?? fallback ?? null;
  if (!target) return null;

  const control = focusTarget(target);
  control.focus({ preventScroll: true });
  // The whole of a set of radios, not just the one focused.
  target.scrollIntoView?.({ block: "center" });
  return control;
}

/**
 * `focusFirstError` once each time a save is turned down: `rejection` is new
 * for each one (the action's state), and null otherwise - so nothing moves on
 * arrival, or after a save that went through.
 */
export function useFocusFirstError(
  rootRef: RefObject<HTMLElement | null>,
  rejection: object | null,
  fallbackRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (rejection !== null && root) focusFirstError(root, fallbackRef?.current);
  }, [rootRef, rejection, fallbackRef]);
}

const enabled = (element: HTMLElement) => !element.matches(":disabled");

function focusTarget(element: HTMLElement): HTMLElement {
  if (element.matches(FOCUSABLE) && enabled(element)) return element;

  // A set of radios: the one chosen, else the first that can be.
  const radios = Array.from(element.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter(enabled);
  const radio = radios.find((input) => input.checked) ?? radios[0];
  if (radio) return radio;

  const inside = Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE)).find(enabled);
  if (inside) return inside;

  // Nothing in it takes focus: the element itself, by script alone.
  if (!element.hasAttribute("tabindex")) element.tabIndex = -1;
  return element;
}

/** Drawn on the page. jsdom cannot say, so there everything counts as shown. */
function shown(element: HTMLElement): boolean {
  return typeof element.checkVisibility !== "function" || element.checkVisibility();
}
