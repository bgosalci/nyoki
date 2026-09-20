"use client";

import { useEffect, useId, useRef } from "react";

import { ui } from "@/lib/brand/ui";

/**
 * An in-app confirmation, in place of the browser's own prompt.
 *
 * Built on the native dialog element, so the browser handles the focus trap,
 * Escape, and returning focus to the button that opened it. Cancel comes
 * first so the safe choice takes focus; the confirming button says what it
 * will do rather than "OK".
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-red-700 text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500"
      : ui.buttonPrimary;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className={`m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border p-6 shadow-xl ${ui.scrim} ${ui.panel} ${ui.rule}`}
    >
      <h2 id={titleId} className={`text-lg font-semibold ${ui.heading}`}>
        {title}
      </h2>
      <p id={descriptionId} className={`mt-2 text-sm ${ui.mutedOnPanel}`}>
        {description}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonSecondary}`}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className={`rounded-md px-4 py-2 text-sm font-medium ${confirmClass}`}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
