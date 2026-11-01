import Link from "next/link";

import { ui } from "@/lib/brand/ui";
import { BUSINESS, legalLine } from "@/lib/policies/business";
import { POLICIES, policyHref } from "@/lib/policies/pages";

const LINK = `text-sm hover:underline hover:underline-offset-4 ${ui.shopMuted}`;
const HEADING = `text-sm font-medium tracking-[0.12em] uppercase ${ui.shopHeading}`;

/**
 * The shop's footer: about us, the departments, help and the policies, our
 * promise - and, at the foot, whose shop it is, in one sentence. The
 * registered office and the address to write to are at the foot of every
 * policy instead (BusinessDetails); in every footer they were too much.
 */
export function ShopFooter({ groups }: { groups: readonly { slug: string; name: string }[] }) {
  return (
    <footer className={`mt-20 border-t ${ui.shopRule} ${ui.shopSurface}`}>
      <div className="mx-auto grid max-w-shop gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <p className={HEADING}>Nyoki Handmade</p>
          <p className={`max-w-prose text-sm leading-relaxed ${ui.shopMuted}`}>
            Where tradition meets modern, the kind way. Handmade in the UK from UK-sourced materials, with biodegradable
            packaging and water-based, solvent-free adhesives.
          </p>
          <Link href="/about" className={LINK}>
            More about us
          </Link>
        </div>
        <nav aria-label="Shop" className="flex flex-col gap-3">
          <p className={HEADING}>Shop</p>
          <ul className="flex flex-col gap-2">
            {groups.map((group) => (
              <li key={group.slug}>
                <Link href={`/shop/${group.slug}`} className={LINK}>
                  {group.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Help" className="flex flex-col gap-3">
          <p className={HEADING}>Help</p>
          <ul className="flex flex-col gap-2">
            {POLICIES.map((policy) => (
              <li key={policy.slug}>
                <Link href={policyHref(policy)} className={LINK}>
                  {policy.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/contact" className={LINK}>
                Contact us
              </Link>
            </li>
          </ul>
        </nav>
        <div className="flex flex-col gap-3">
          <p className={HEADING}>Our promise</p>
          <ul className={`flex flex-col gap-2 text-sm ${ui.shopMuted}`}>
            <li>Every piece touched by human hands</li>
            <li>Eco-friendly, organic and recyclable materials</li>
            <li>Materials sourced in the UK</li>
          </ul>
        </div>
      </div>
      <div className={`border-t px-4 py-5 text-center text-xs sm:px-6 ${ui.shopRule} ${ui.shopMuted}`}>
        <p>{legalLine(BUSINESS)}</p>
      </div>
    </footer>
  );
}
