"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { topNavCurrent } from "@/lib/storefront/nav";

const LINKS = [
  { href: "/shop", label: "Shop", section: "shop" as const },
  { href: "/about", label: "About us", section: "about" as const },
];

/** The header's top row: where the shop sits alongside everything that is not shopping. */
export function TopNav() {
  const current = topNavCurrent(usePathname());

  return (
    <nav aria-label="Main">
      {/* Smaller and closer on a phone, leaving the logo room between. */}
      <ul className="flex items-center gap-4 sm:gap-6">
        {LINKS.map((link) => {
          const active = current === link.section;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`text-xs font-semibold tracking-[0.12em] uppercase sm:text-sm ${
                  active
                    ? "text-nyoki-navy underline decoration-nyoki-sage decoration-2 underline-offset-8"
                    : "text-nyoki-navy hover:underline hover:decoration-nyoki-sage hover:decoration-2 hover:underline-offset-8"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
