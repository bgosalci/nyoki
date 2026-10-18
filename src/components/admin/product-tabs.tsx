"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ui } from "@/lib/brand/ui";

/**
 * A product's pages: what it is, and what it sells for - and, for a card or
 * bookmark, how a shopper can have it made up.
 *
 * Links rather than toggled panels, so each tab has an address - a price can
 * be linked to directly, and the back button goes back a tab.
 */
export function ProductTabs({ productId, customisable = false }: { productId: string; customisable?: boolean }) {
  const pathname = usePathname();
  const base = `/admin/products/${productId}`;

  const tabs = [
    { href: base, label: "Details", current: pathname === base },
    { href: `${base}/price`, label: "Price", current: pathname.startsWith(`${base}/price`) },
    ...(customisable
      ? [{ href: `${base}/customise`, label: "Customise", current: pathname.startsWith(`${base}/customise`) }]
      : []),
  ];

  return (
    <nav aria-label="Product" className={`flex gap-1 border-b ${ui.rule}`}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.current ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2 text-sm ${
            tab.current ? "border-current font-medium" : `border-transparent ${ui.mutedOnPage} hover:border-current`
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
