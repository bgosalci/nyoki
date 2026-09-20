"use client";

import { ui } from "@/lib/brand/ui";
import { useId } from "react";

/**
 * A labelled form control that wires up its own error messaging.
 *
 * The error is linked with aria-describedby and the control marked
 * aria-invalid, so a screen reader announces the problem when focus lands on
 * the field rather than only when the summary is read.
 */
export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: (props: {
    id: string;
    name: string;
    "aria-invalid"?: "true";
    "aria-describedby"?: string;
  }) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>

      {children({
        id,
        name,
        ...(error ? { "aria-invalid": "true" as const } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}

      {hint ? (
        <p id={hintId} className={`text-xs ${ui.mutedOnPage}`}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass = `rounded-md border px-3 py-2 text-sm outline-none aria-[invalid]:border-red-400 ${ui.input}`;
