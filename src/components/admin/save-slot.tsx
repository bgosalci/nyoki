"use client";

import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

import { ui } from "@/lib/brand/ui";

/** The slot, once it is on the page, and how it says it is. */
const SlotContext = createContext<[HTMLElement | null, (slot: HTMLElement | null) => void] | null>(null);

/**
 * Wraps a page's header and its form, so the form's Save can be drawn beside
 * the title. The slot registers itself here when it is put on the page and
 * when it is taken off; the button draws into whichever slot is current.
 *
 * Held in React state rather than found by searching the page: moving to
 * another product replaces the whole header, and a search made while React
 * is drawing can find the header on its way out.
 */
export function SaveSlotProvider({ children }: { children: React.ReactNode }) {
  const slot = useState<HTMLElement | null>(null);
  return <SlotContext.Provider value={slot}>{children}</SlotContext.Provider>;
}

/**
 * The place beside a page's title where its form puts a second Save, so a
 * long form - a product's forty categories, the Price tab's sale table - can
 * be saved without scrolling to the bottom.
 */
export function SaveSlot() {
  const context = useContext(SlotContext);
  return <div data-save-slot ref={context?.[1]} className="flex shrink-0 items-center" />;
}

/**
 * The form's Save, drawn in the SaveSlot. It is rendered by the form, so it
 * shares the form's pending state - "Saving…", and no second press - though
 * it sits outside the form's markup; `form` ties it back so it submits
 * exactly as the Save at the bottom does. With no slot, nothing.
 */
export function TopSaveButton({ form, pending, label }: { form: string; pending: boolean; label: string }) {
  const slot = useContext(SlotContext)?.[0];
  if (!slot) return null;

  return createPortal(
    <button type="submit" form={form} disabled={pending} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonPrimary}`}>
      {pending ? "Saving…" : label}
    </button>,
    slot,
  );
}
