import { useId } from "react";

import { ui } from "@/lib/brand/ui";

/**
 * A setting that is on or off, as a switch: a checkbox with the switch role,
 * so it posts as one ("on", or nothing) and is announced as a switch.
 *
 * Laid out as a field, its label above, so it lines up beside the boxes in a
 * row of them. Uncontrolled: React keeps `defaultChecked` in step with the
 * prop, so the reset after a save shows what was saved.
 */
export function Toggle({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked: boolean; hint: string }) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-medium">
        {label}
      </span>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          role="switch"
          name={name}
          defaultChecked={defaultChecked}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-hint`}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:shadow-sm after:transition-transform after:duration-150 peer-checked:after:translate-x-5 motion-reduce:transition-none motion-reduce:after:transition-none ${ui.toggle}`}
        />
        <span id={`${id}-hint`} className={`text-xs ${ui.mutedOnPage}`}>
          {hint}
        </span>
      </label>
    </div>
  );
}
