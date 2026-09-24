"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ui } from "@/lib/brand/ui";

/** Past this many names, the rest are counted instead. */
const NAMES_SHOWN = 5;

/**
 * Choosing files in a way that looks like it: a large dashed area with a
 * Choose button and room to drop files, rather than the browser's bare
 * "Choose files / No file chosen", which reads as a line of text and not as
 * something to click.
 *
 * The whole area is the file input's label, so a click anywhere on it opens
 * the chooser; the input itself is only visually hidden, so it still takes
 * keyboard focus, and the area shows a ring when it has it. Dropped files are
 * put into the input, so the surrounding form posts them like chosen ones.
 * What was chosen is named, and forgotten when the form is reset, as React
 * does after an upload.
 */
export function FilePicker({
  id,
  name,
  label,
  prompt,
  hint,
  accept,
  multiple = false,
  onFiles,
}: {
  id: string;
  name: string;
  label: string;
  /** What the button says: "Choose photos", "Choose a CSV file". */
  prompt: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const labelId = useId();
  const hintId = useId();

  function take(files: File[]) {
    const kept = multiple ? files : files.slice(0, 1);
    setChosen(kept.map((file) => file.name));
    onFiles?.(kept);
  }

  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const forget = () => {
      setChosen([]);
      onFiles?.([]);
    };
    form.addEventListener("reset", forget);
    return () => form.removeEventListener("reset", forget);
  }, [onFiles]);

  const names =
    chosen.length > NAMES_SHOWN
      ? `${chosen.slice(0, NAMES_SHOWN).join(", ")} and ${chosen.length - NAMES_SHOWN} more`
      : chosen.join(", ");

  return (
    <div className="flex flex-col gap-1.5">
      <p id={labelId} className="text-sm font-medium">
        {label}
      </p>

      <input
        ref={input}
        id={id}
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => take(Array.from(event.currentTarget.files ?? []))}
        className="peer sr-only"
      />

      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = Array.from(event.dataTransfer.files);
          if (dropped.length === 0) return;
          try {
            const transfer = new DataTransfer();
            for (const file of multiple ? dropped : dropped.slice(0, 1)) transfer.items.add(file);
            if (input.current) input.current.files = transfer.files;
          } catch {
            // Without DataTransfer the names still show; the chooser still works.
          }
          take(dropped);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${ui.rule} ${
          dragging ? ui.navActive : ui.navItem
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-8">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={`rounded-md px-3.5 py-1.5 text-sm font-medium ${ui.buttonSecondary}`}>{prompt}</span>
        <span className="text-sm">or drag {multiple ? "them" : "it"} here</span>
        {chosen.length > 0 ? (
          <span aria-live="polite" className="text-sm font-medium">
            {chosen.length} chosen: {names}
          </span>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className={`text-xs ${ui.mutedOnPage}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
