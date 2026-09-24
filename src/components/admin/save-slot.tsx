"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { ui } from "@/lib/brand/ui";

export const SAVE_SLOT_ID = "page-save";

// The slot is in the page's header, committed with the form or before it;
// nothing moves it afterwards, so there is nothing to listen for.
const subscribe = () => () => {};

/**
 * The place beside a page's title where its form puts a second Save, so a
 * long form - a product's forty categories, the Price tab's sale table - can
 * be saved without scrolling to the bottom.
 */
export function SaveSlot() {
  return <div id={SAVE_SLOT_ID} className="flex shrink-0 items-center" />;
}

/**
 * The form's Save, drawn in the SaveSlot. It is rendered by the form, so it
 * shares the form's pending state - "Saving…", and no second press - though
 * it sits outside the form's markup; `form` ties it back so it submits
 * exactly as the Save at the bottom does. With no slot on the page, nothing.
 */
export function TopSaveButton({ form, pending, label }: { form: string; pending: boolean; label: string }) {
  const slot = useSyncExternalStore(
    subscribe,
    () => document.getElementById(SAVE_SLOT_ID),
    () => null,
  );
  if (!slot) return null;

  return createPortal(
    <button type="submit" form={form} disabled={pending} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonPrimary}`}>
      {pending ? "Saving…" : label}
    </button>,
    slot,
  );
}
