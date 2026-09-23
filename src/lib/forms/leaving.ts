/**
 * What an unsaved-changes warning needs to know: whether a click is about to
 * take this page away, and whether the form has changed since it was loaded
 * or last saved.
 */

/**
 * The link a click is about to leave the page by, or null if it will not.
 *
 * Only a plain click that navigates this tab to another page of this site
 * counts. A click that opens a new tab or window keeps the page open, a
 * download does not navigate, and another site unloads the page - which the
 * browser's own warning (beforeunload) covers.
 */
export function linkLeavingPage(event: MouseEvent, currentHref: string): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;

  const target = event.target;
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;

  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  const to = new URL(anchor.getAttribute("href") ?? "", currentHref);
  const from = new URL(currentHref);
  if (to.origin !== from.origin) return null;
  // The same page, or a place on it: nothing is lost.
  if (to.pathname === from.pathname && to.search === from.search) return null;

  return anchor;
}

/**
 * Everything the form would post, as one comparable string. Taken from the
 * form itself rather than from React state, so it works alike for inputs
 * React controls and inputs it does not, and notices a row taken away.
 *
 * `ignore` names fields that are only there to work something out - a margin
 * that sets the price - and are never saved; changing them is not a change.
 */
export function formSnapshot(form: HTMLFormElement, ignore: readonly string[] = []): string {
  const entries: [string, string][] = [];
  for (const [name, value] of new FormData(form)) {
    if (ignore.includes(name)) continue;
    entries.push([name, typeof value === "string" ? value : value.name]);
  }
  return JSON.stringify(entries);
}
