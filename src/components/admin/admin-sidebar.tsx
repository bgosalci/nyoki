"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { useWaitingQuestions } from "@/components/admin/question-alerts";
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
  "/admin/questions": (
    <>
      <path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2v-10Z" strokeLinejoin="round" />
      <path d="M10.2 8.8a1.8 1.8 0 1 1 2.6 1.6c-.5.3-.8.6-.8 1.1" strokeLinecap="round" />
      <path d="M12 13.4h.01" strokeLinecap="round" />
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

/** The sidebar, which the top bar's Menu shows on a phone. */
const MENU_ID = "admin-menu";

interface Menu {
  open: boolean;
  setOpen: (open: boolean) => void;
  button: React.RefObject<HTMLButtonElement | null>;
}

const MenuContext = createContext<Menu | null>(null);

/**
 * Whether the phone's menu is open, shared by the top bar's Menu button and
 * the sidebar it shows. Open only on the page it was opened on, so arriving
 * anywhere else - by the menu, or the browser's Back - finds it shut.
 */
export function AdminMenuProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const open = openOn === pathname;

  const menu = useMemo(() => ({ open, setOpen: (next: boolean) => setOpenOn(next ? pathname : null), button }), [open, pathname]);
  return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>;
}

/**
 * The top bar's way to the pages on a phone, where the sidebar laid out
 * above every page pushed the page itself halfway down the first screen.
 * It carries the count of questions waiting, since Questions is shut away
 * behind it. From md up the sidebar is always there, and this is not.
 */
export function AdminMenuButton() {
  const menu = useContext(MenuContext);
  const waiting = useWaitingQuestions();
  const open = menu?.open ?? false;

  return (
    <button
      ref={menu?.button}
      type="button"
      aria-expanded={open}
      aria-controls={MENU_ID}
      // Said whole, as the sidebar's Questions is.
      aria-label={waiting > 0 ? `Menu, ${waiting} ${waiting === 1 ? "question" : "questions"} waiting` : undefined}
      onClick={() => menu?.setOpen(!open)}
      className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm md:hidden ${open ? ui.navActive : ui.navItem}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-5 shrink-0">
        <path d={open ? "m6 6 12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} strokeLinecap="round" />
      </svg>
      Menu
      {waiting > 0 ? (
        <span aria-hidden="true" className={`min-w-5 rounded-full px-1.5 text-center text-xs leading-5 font-semibold tabular-nums ${ui.badgeSale}`}>
          {waiting}
        </span>
      ) : null}
    </button>
  );
}

/**
 * The admin sidebar: a destination per row with an icon, and a control to
 * narrow it to icons alone.
 *
 * Collapsing hides the labels from the eye but not from a screen reader - a
 * column of unlabelled icons is unusable without sight. The choice is
 * remembered per browser, which is all localStorage should ever be trusted
 * with.
 *
 * On a phone it is shut away behind the top bar's Menu, and opens over the
 * page, beneath the bar: a page further down would put it out of sight. It
 * shuts once a page is chosen, on Escape, and on a press anywhere else.
 * Above the pinned headers (z-20), below the bar (z-30).
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const waiting = useWaitingQuestions();
  const menu = useContext(MenuContext);
  const open = menu?.open ?? false;
  const aside = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open || !menu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      menu.setOpen(false);
      menu.button.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      // The button shuts it itself.
      if (aside.current?.contains(target) || menu.button.current?.contains(target)) return;
      menu.setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, menu]);

  const phone = open ? "fixed inset-x-0 top-14 z-[25] max-h-[calc(100dvh-6.5rem)] overflow-y-auto shadow-lg" : "hidden";

  return (
    <aside
      ref={aside}
      id={MENU_ID}
      className={`shrink-0 border-b p-4 md:static md:z-auto md:block md:max-h-none md:overflow-visible md:border-r md:border-b-0 md:shadow-none ${phone} ${collapsed ? "md:w-16" : "md:w-56"} ${ui.panel} ${ui.rule}`}
    >
      <div className="md:sticky md:top-[calc(3.5rem+1rem)]">
        <nav aria-label="Shop admin" className="flex flex-col gap-0.5">
          {ADMIN_NAV.map((item) => {
            const current = isCurrent(pathname, item.href);
            // Shoppers' questions not yet answered, counted live.
            const count = item.href === "/admin/questions" ? waiting : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                // Said whole, rather than pieced together from the label and the badge.
                aria-label={count > 0 ? `${item.label}, ${count} waiting` : undefined}
                title={collapsed ? item.label : undefined}
                onClick={() => menu?.setOpen(false)}
                className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm ${collapsed ? "md:justify-center" : ""} ${current ? ui.navActive : ui.navItem}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-5 shrink-0">
                  {ICONS[item.href]}
                </svg>
                <span className={collapsed ? "md:sr-only" : undefined}>{item.label}</span>
                {count > 0 ? (
                  <span
                    aria-hidden="true"
                    className={`ml-auto min-w-5 rounded-full px-1.5 text-center text-xs leading-5 font-semibold tabular-nums ${ui.badgeSale} ${collapsed ? "md:absolute md:top-0 md:right-0 md:ml-0" : ""}`}
                  >
                    {count}
                  </span>
                ) : null}
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
