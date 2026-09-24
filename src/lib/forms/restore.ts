/**
 * Puts what was submitted back into a form that has just been reset.
 *
 * React 19 resets a form after its action returns - after a save the server
 * rejected, too - so everything typed goes back to what was last saved.
 * This undoes that reset for a rejected save.
 *
 * Left alone: passwords, which a sign-in or password form clears after a
 * failure by convention; files, which a page cannot set; hidden values,
 * which a reset does not touch; and anything disabled or unnamed, which was
 * never submitted.
 */
const SKIPPED = new Set(["password", "file", "hidden", "submit", "button", "reset", "image"]);

export function restoreFormValues(form: HTMLFormElement, submitted: FormData): void {
  // Fields sharing a name - the three promises - take their values in order.
  const taken = new Map<string, number>();
  const valuesOf = (name: string) => submitted.getAll(name).map((value) => (typeof value === "string" ? value : ""));

  for (const element of Array.from(form.elements)) {
    if (element instanceof HTMLInputElement) {
      if (!element.name || element.disabled || SKIPPED.has(element.type)) continue;

      if (element.type === "checkbox" || element.type === "radio") {
        element.checked = valuesOf(element.name).includes(element.value);
        continue;
      }
    } else if (element instanceof HTMLSelectElement) {
      if (!element.name || element.disabled) continue;
      const chosen = valuesOf(element.name);
      for (const option of Array.from(element.options)) option.selected = chosen.includes(option.value);
      continue;
    } else if (!(element instanceof HTMLTextAreaElement) || !element.name || element.disabled) {
      continue;
    }

    const index = taken.get(element.name) ?? 0;
    taken.set(element.name, index + 1);
    const value = valuesOf(element.name)[index];
    if (value !== undefined) element.value = value;
  }
}
