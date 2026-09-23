export interface AdminNavItem {
  href: string;
  label: string;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/sales", label: "Sales" },
  { href: "/admin/codes", label: "Promo codes" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/home", label: "Home page" },
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

/** The section a path belongs to, for the top bar. */
export function sectionTitle(pathname: string): string {
  return ADMIN_NAV.find((item) => isCurrent(pathname, item.href))?.label ?? "Nyoki";
}
