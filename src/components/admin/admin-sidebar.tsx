"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { ADMIN_NAV, isCurrent } from "@/lib/admin/nav";
import { ui } from "@/lib/brand/ui";

const STORAGE_KEY = "nyoki-admin-sidebar-collapsed";

/** One line icon per destination, drawn to the same 24px grid and weight. */
const ICONS: Record<string, React.ReactNode> = {
  "/admin": (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </>
  ),
  "/admin/products": (
    <>
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" strokeLinejoin="round" />
      <path d="m4 8.5 8 4.5 8-4.5M12 13v7" />
    </>
  ),
  "/admin/categories": (
    <>
      <path d="M3.5 6.5a1 1 0 0 1 1-1h4l1.5 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1v-11Z" strokeLinejoin="round" />
    </>
  ),
  "/admin/sales": (
    <>
      <path d="m6 18 12-12" strokeLinecap="round" />
      <circle cx="7.5" cy="7.5" r="2" />
      <circle cx="16.5" cy="16.5" r="2" />
    </>
  ),
  "/admin/codes": (
    <>
      <path d="M3.5 9V7a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 5v2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-5Z" strokeLinejoin="round" />
      <path d="M13 8v8" strokeDasharray="2 2.5" strokeLinecap="round" />
    </>
  ),
  "/admin/orders": (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </>
  ),
  "/admin/home": (
    <>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
      <path d="M9.5 21v-6h5v6" strokeLinejoin="round" />
    </>
  ),
  "/admin/settings": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" strokeLinecap="round" />
    </>
  ),
};

/**
 * The preference is external state that React does not own, so it is read
 * through useSyncExternalStore rather than copied into state by an effect.
 * That also keeps the server's render (expanded) and the browser's first
 * paint in step.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // Private windows and blocked site data both throw. An unreadable
    // preference is not a reason to fail; open expanded.
    return false;
  }
}

/** The server cannot know this browser's preference, so it renders expanded. */
function getServerSnapshot(): boolean {
  return false;
}

function remember(collapsed: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    // Not remembering is a smaller problem than not working.
  }
  for (const listener of listeners) listener();
}

/**
 * The admin sidebar: a destination per row with an icon, and a control to
 * narrow it to icons alone.
 *
 * Collapsing hides the labels from the eye but not from a screen reader - a
 * column of unlabelled icons is unusable without sight. The choice is
 * remembered per browser, which is all localStorage should ever be trusted
 * with.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <aside
      className={`shrink-0 border-b p-4 md:border-r md:border-b-0 ${collapsed ? "md:w-16" : "md:w-56"} ${ui.panel} ${ui.rule}`}
    >
      <div className="md:sticky md:top-[calc(3.5rem+1rem)]">
        <nav aria-label="Shop admin" className="flex flex-col gap-0.5">
          {ADMIN_NAV.map((item) => {
            const current = isCurrent(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${collapsed ? "md:justify-center" : ""} ${current ? ui.navActive : ui.navItem}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-5 shrink-0">
                  {ICONS[item.href]}
                </svg>
                <span className={collapsed ? "md:sr-only" : undefined}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => remember(!collapsed)}
          aria-expanded={!collapsed}
          className={`mt-3 hidden w-full items-center gap-3 rounded-md px-3 py-2 text-sm md:flex ${collapsed ? "md:justify-center" : ""} ${ui.navItem}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-5 shrink-0">
            <path d={collapsed ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={collapsed ? "md:sr-only" : undefined}>{collapsed ? "Expand" : "Collapse"}</span>
        </button>
      </div>
    </aside>
  );
}
