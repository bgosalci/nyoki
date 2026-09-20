"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_NAV, isCurrent, type AdminNavItem } from "@/lib/admin/nav";
import { ui } from "@/lib/brand/ui";

export { ADMIN_NAV, isCurrent };

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
            className={current ? `rounded-md px-3 py-2 text-sm ${ui.navActive}` : `rounded-md px-3 py-2 text-sm ${ui.navItem}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
