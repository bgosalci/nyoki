import Link from "next/link";

const ICON = "size-6 stroke-nyoki-navy";

/**
 * Search, account and basket.
 *
 * Search works: it leads to the Everything page, which is where you search.
 * The other two are in the design and hold their place, but neither customer
 * accounts nor a basket exist yet, so they are rendered disabled rather than
 * as links that would silently do nothing.
 */
export function HeaderIcons() {
  return (
    <ul className="flex items-center justify-end gap-5">
      <li>
        <Link href="/shop" aria-label="Search" className="block hover:opacity-70">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" aria-hidden="true" className={ICON}>
            <circle cx="11" cy="11" r="7" />
            <path d="m16.5 16.5 4 4" strokeLinecap="round" />
          </svg>
        </Link>
      </li>
      <li>
        <button type="button" disabled aria-label="Account" title="Accounts coming soon" className="block opacity-40">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" aria-hidden="true" className={ICON}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
          </svg>
        </button>
      </li>
      <li>
        <button type="button" disabled aria-label="Basket" title="Basket coming soon" className="block opacity-40">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" aria-hidden="true" className={ICON}>
            <path d="M5 8h14l-1 12H6L5 8Z" strokeLinejoin="round" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
          </svg>
        </button>
      </li>
    </ul>
  );
}
