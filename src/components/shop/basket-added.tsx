"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import type { AddedPiece, BasketSummary } from "@/app/(shop)/basket/actions";
import { FreeDeliveryNote } from "@/components/shop/free-delivery-note";
import { formatPence } from "@/lib/money";

/**
 * Saying a piece went in, from the basket in the header.
 *
 * The product page puts the piece in; the header, in the layout above it,
 * says so. This context joins the two. On a computer a small panel drops
 * from the basket icon - what went in, how far from free delivery, and the
 * way to the basket or checkout - with nothing dimmed, and the next click
 * anywhere closes it. On a phone the panel is not drawn: the notice above
 * the page's own bar says it instead.
 */

export interface AddedNotice {
  added: AddedPiece;
  basket: BasketSummary;
  note: string | null;
}

interface BasketAdded {
  notice: AddedNotice | null;
  show: (notice: AddedNotice) => void;
  dismiss: () => void;
}

const BasketAddedContext = createContext<BasketAdded | null>(null);

/** Null outside the provider - a page in a test, say - where saying so is simply skipped. */
export function useBasketAdded(): BasketAdded | null {
  return useContext(BasketAddedContext);
}

export function BasketAddedProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<AddedNotice | null>(null);
  const pathname = usePathname();

  // Gone on the way to another page: the panel is about the page it was on.
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    if (notice) setNotice(null);
  }

  return (
    <BasketAddedContext.Provider value={{ notice, show: setNotice, dismiss: () => setNotice(null) }}>
      {children}
    </BasketAddedContext.Provider>
  );
}

const ICON = "size-5 stroke-nyoki-navy sm:size-6";

/** The basket in the header: a link to it with the count, and the panel beneath it. */
export function BasketIcon({ pieces }: { pieces: number }) {
  const label = pieces === 0 ? "Basket" : `Basket, ${pieces} ${pieces === 1 ? "piece" : "pieces"}`;

  return (
    <div className="relative">
      <Link href="/basket" aria-label={label} title="Basket" className="relative block">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" aria-hidden="true" className={ICON}>
          <path d="M5 8h14l-1 12H6L5 8Z" strokeLinejoin="round" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
        </svg>
        {pieces > 0 ? (
          <span className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-nyoki-navy px-1 text-[10px] leading-4 text-nyoki-beige">
            {pieces}
          </span>
        ) : null}
      </Link>
      <AddedPanel />
    </div>
  );
}

function AddedPanel() {
  const basket = useBasketAdded();
  const panel = useRef<HTMLElement>(null);
  const open = basket?.notice !== null && basket?.notice !== undefined;
  const dismiss = basket?.dismiss;

  useEffect(() => {
    if (!open || !dismiss) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    const onPointer = (event: PointerEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) dismiss();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, dismiss]);

  if (!basket?.notice) return null;
  const { added, basket: summary, note } = basket.notice;
  const free = summary.freeDelivery;

  return (
    <section
      ref={panel}
      aria-label="Added to your basket"
      className="absolute top-full right-[-10px] z-40 mt-4 hidden w-[380px] rounded-[20px] border-[1.5px] border-nyoki-light-slate bg-nyoki-white p-[22px] text-left shadow-[0_1px_2px_rgb(0_0_0/0.03),0_18px_40px_-18px_rgb(0_0_0/0.3)] md:block"
    >
      {/* The nub pointing at the basket icon. */}
      <span
        aria-hidden="true"
        className="absolute -top-[8px] right-[14px] size-3.5 rotate-45 rounded-tl-[3px] border-t-[1.5px] border-l-[1.5px] border-nyoki-light-slate bg-nyoki-white"
      />
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2.5 font-medium text-nyoki-ink">
          <span aria-hidden="true" className="grid size-[22px] place-items-center rounded-full bg-nyoki-navy">
            <svg viewBox="0 0 16 16" fill="none" strokeWidth="2.4" className="size-3 stroke-nyoki-white">
              <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Added to your basket
        </p>
        <button
          type="button"
          aria-label="Close"
          onClick={basket.dismiss}
          className="grid size-8 place-items-center rounded-full hover:bg-nyoki-accent-beige focus-visible:outline-2 focus-visible:outline-nyoki-navy"
        >
          <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.8" aria-hidden="true" className="size-3.5 stroke-nyoki-navy">
            <path d="m4 4 8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3.5">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-nyoki-soft-ash">
          {added.image ? <Image src={added.image} alt="" fill sizes="64px" className="object-cover" /> : null}
        </div>
        <div>
          <p className="leading-snug font-medium text-nyoki-ink">{added.name}</p>
          <p className="mt-0.5 text-sm text-nyoki-text-dark tabular-nums">
            {added.quantity} × {formatPence(added.unitPence)}
          </p>
        </div>
      </div>

      {note ? <p className="mt-3 text-sm text-nyoki-text-dark">{note}</p> : null}

      {free ? (
        <div className="mt-4">
          <FreeDeliveryNote free={free} subtotalPence={summary.subtotalPence} />
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Link
          href="/basket"
          className="grid h-11 place-items-center rounded-full text-sm font-medium tracking-[0.12em] text-nyoki-navy uppercase ring-[1.5px] ring-nyoki-navy ring-inset hover:bg-nyoki-accent-beige"
        >
          View basket
        </Link>
        <Link
          href="/checkout"
          className="grid h-11 place-items-center rounded-full bg-nyoki-navy text-sm font-medium tracking-[0.12em] text-nyoki-beige uppercase hover:bg-nyoki-ink"
        >
          Checkout
        </Link>
      </div>
    </section>
  );
}
