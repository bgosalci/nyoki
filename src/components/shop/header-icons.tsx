import Link from "next/link";

import { BasketIcon } from "@/components/shop/basket-added";

// A size smaller and closer together on a phone, leaving the logo room.
const ICON = "size-5 stroke-nyoki-navy sm:size-6";

/**
 * Search, account, saved pieces and basket.
 *
 * Each holds its place in the design and becomes real in its turn; until one
 * does it is rendered disabled rather than as a control that would silently
 * do nothing. Search is still to come, and the basket is only real while
 * ordering is open: `basket` is null while it is closed.
 */
export function HeaderIcons({
  signedIn = false,
  savedCount = 0,
  basket = null,
}: {
  signedIn?: boolean;
  savedCount?: number;
  basket?: { pieces: number } | null;
}) {
  return (
    <ul className="flex items-center justify-end gap-3 sm:gap-5">
      <li>
        <button type="button" disabled aria-label="Search" title="Search coming soon" className="block opacity-40">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" aria-hidden="true" className={ICON}>
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" strokeLinecap="round" />
          </svg>
        </button>
      </li>
      <li>
        <Link
          href={signedIn ? "/account" : "/account/sign-in"}
          aria-label={signedIn ? "Your account" : "Sign in"}
          title={signedIn ? "Your account" : "Sign in"}
          className="block"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" aria-hidden="true" className={ICON}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
          </svg>
        </Link>
      </li>
      <li>
        <Link href="/account/favourites" aria-label="Saved pieces" title="Saved pieces" className="relative block">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" aria-hidden="true" className={ICON}>
            <path
              d="M12 20.5 4.7 13.4a4.6 4.6 0 1 1 6.5-6.5l.8.8.8-.8a4.6 4.6 0 1 1 6.5 6.5Z"
              strokeLinejoin="round"
            />
          </svg>
          {savedCount > 0 ? (
            <span className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-nyoki-navy px-1 text-[10px] leading-4 text-nyoki-beige">
              {savedCount}
            </span>
          ) : null}
        </Link>
      </li>
      <li>
        {basket ? (
          <BasketIcon pieces={basket.pieces} />
        ) : (
          <button type="button" disabled aria-label="Basket" title="Basket coming soon" className="block opacity-40">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" aria-hidden="true" className={ICON}>
              <path d="M5 8h14l-1 12H6L5 8Z" strokeLinejoin="round" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </li>
    </ul>
  );
}
