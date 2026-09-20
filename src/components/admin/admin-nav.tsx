"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminNavItem {
  href: string;
  label: string;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/sales", label: "Sales" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/settings", label: "Settings" },
];

/**
 * `/admin` would otherwise be marked current on every page beneath it, so the
 * overview matches exactly and the rest match their subtree.
 */
export function isCurrent(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ items = ADMIN_NAV }: { items?: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Shop admin" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const current = isCurrent(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={
              current
                ? "rounded-md bg-black/[0.06] px-3 py-2 text-sm font-medium dark:bg-white/10"
                : "rounded-md px-3 py-2 text-sm text-black/70 hover:bg-black/[0.04] dark:text-white/70 dark:hover:bg-white/5"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
