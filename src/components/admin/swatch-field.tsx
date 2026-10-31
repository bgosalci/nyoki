"use client";

import { useId, useLayoutEffect, useRef } from "react";

import { ui } from "@/lib/brand/ui";
import type { Swatch } from "@/lib/home/colours";

/**
 * Choosing a colour by seeing it: a round swatch and its name for each
 * colour offered, as radio buttons, so the arrow keys move between them.
 *
 * Controlled. Like `Select`, it keeps the chosen colour the default after
 * every render, since React resets a form after it saves and would otherwise
 * put back the colour the page opened with while still holding the new one.
 */
export function SwatchField({
  label,
  name,
  options,
  value,
  onChange,
  hint,
  error,
}: {
  label: string;
  /** Posted under this name; without one, the caller posts the value itself. */
  name?: string;
  options: readonly Swatch[];
  value: string;
  onChange: (token: string) => void;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const group = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    for (const input of group.current?.querySelectorAll("input") ?? []) input.defaultChecked = input.value === value;
  });

  return (
    <div className="flex flex-col gap-1.5">
      <p id={`${id}-label`} className="text-sm font-medium">
        {label}
      </p>
      <div
        ref={group}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <label
            key={option.token}
            className={`flex cursor-pointer items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs has-focus-visible:outline-2 ${ui.rule} ${
              option.token === value ? ui.navActive : ""
            }`}
          >
            <input
              type="radio"
              name={name ?? `${id}-swatch`}
              value={option.token}
              checked={option.token === value}
              onChange={() => onChange(option.token)}
              className="sr-only"
            />
            <span aria-hidden="true" className={`size-6 shrink-0 rounded-full border ${ui.rule}`} style={{ backgroundColor: option.hex }} />
            {option.name}
          </label>
        ))}
      </div>
      {hint ? <p className={`text-xs ${ui.mutedOnPage}`}>{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
