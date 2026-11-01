import Image from "next/image";
import Link from "next/link";

import { LOGO } from "@/lib/brand/logo";
import { ui } from "@/lib/brand/ui";
import { BUSINESS, legalLine } from "@/lib/policies/business";
import { POLICIES, policyHref } from "@/lib/policies/pages";

/**
 * Checkout's own chrome: the way back to the basket, the logo, and nothing
 * else to wander off into. The shop's departments and footer stay behind;
 * the logo still leads home.
 */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex min-h-dvh flex-col ${ui.shopPage}`}>
      <header className={`border-b ${ui.shopRule} ${ui.shopPage}`}>
        <div className="mx-auto grid max-w-shop grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
          <Link href="/basket" className="inline-flex items-center gap-2 justify-self-start text-xs font-semibold tracking-[0.12em] uppercase sm:text-[13px]">
            <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.6" aria-hidden="true" className="size-4 stroke-nyoki-navy">
              <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Basket
          </Link>
          <Link href="/" aria-label="Nyoki Handmade, home">
            <Image src={LOGO.src} alt="Nyoki Handmade" width={LOGO.width} height={LOGO.height} priority className="h-12 w-auto object-contain sm:h-[84px]" />
          </Link>
          <p className="inline-flex items-center gap-2 justify-self-end text-xs font-semibold tracking-[0.12em] uppercase sm:text-[13px]">
            <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.6" aria-hidden="true" className="size-4 stroke-nyoki-navy">
              <rect x="3" y="7" width="10" height="7" rx="1.5" />
              <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" strokeLinecap="round" />
            </svg>
            <span className="sr-only sm:not-sr-only">Checkout</span>
          </p>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* The policies stay a link away, as the law asks of the page an order is placed on. */}
      <footer className={`mt-16 flex flex-col gap-2 border-t px-4 py-6 text-center text-xs sm:px-6 ${ui.shopRule} ${ui.shopMuted}`}>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <li>© {new Date().getFullYear()} Nyoki Handmade</li>
          <li>
            <Link href="/contact" className="underline underline-offset-4">
              Contact us
            </Link>
          </li>
          {POLICIES.map((policy) => (
            <li key={policy.slug}>
              <Link href={policyHref(policy)} className="underline underline-offset-4">
                {policy.short}
              </Link>
            </li>
          ))}
        </ul>
        <p>{legalLine(BUSINESS)}</p>
      </footer>
    </div>
  );
}
