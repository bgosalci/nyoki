"use client";

import { useEffect, useId, useRef } from "react";

import { ui } from "@/lib/brand/ui";

/**
 * The shop's confirmation, in place of the browser's own prompt.
 *
 * The admin's ConfirmDialog carries dark-mode colours, which the light-only
 * shop must not borrow, so the shop has its own in its own colours. Built on
 * the native dialog element, so the browser handles the focus trap, Escape,
 * and returning focus. The safe choice comes first so it takes focus, and the
 * confirming button says what it will do rather than "OK".
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
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

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className={`m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border p-6 shadow-xl ${ui.scrim} ${ui.shopSurface} ${ui.shopRule}`}
    >
      <h2 id={titleId} className={`text-lg leading-snug font-medium ${ui.shopHeading}`}>
        {title}
      </h2>
      <p id={descriptionId} className={`mt-2 text-[15px] ${ui.shopMuted}`}>
        {description}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={`min-h-11 px-5 text-sm font-medium ${ui.shopButtonOutline}`}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} className={`min-h-11 px-5 text-sm font-medium ${ui.shopButton}`}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
