"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export interface DepartmentGroup {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
}

/**
 * The department row, each with a drop-down of its sub-categories.
 *
 * Opens on hover and on focus, so the keyboard reaches the sub-categories the
 * same way the mouse does. It closes when the pointer leaves, when focus moves
 * out of the department, and - the reason this holds state rather than being
 * pure CSS - whenever the page changes: a link keeps focus after navigating,
 * which would otherwise leave the menu hanging open over the page it just
 * opened.
 *
 * The panels stay in the markup and are hidden, so the links are in the HTML
 * for crawlers while screen readers skip them until the menu opens. The panel
 * is positioned against the header rather than the link so it spans the full
 * width - Clothes has around thirty sub-categories and needs columns - and the
 * links carry the row's vertical padding themselves, leaving no dead gap for
 * the pointer to fall through on the way down.
 *
 * On a touch screen, where there is neither hover nor focus, tapping the
 * department still goes to its page, which lists the same sub-categories.
 */
export function DepartmentNav({ groups }: { groups: DepartmentGroup[] }) {
  const pathname = usePathname();
  // The open menu is remembered together with the page it was opened on, so a
  // change of page closes it by derivation rather than by an effect that would
  // set state during render.
  const [opened, setOpened] = useState<{ slug: string; at: string } | null>(null);
  const openSlug = opened !== null && opened.at === pathname ? opened.slug : null;

  const open = (slug: string) => setOpened({ slug, at: pathname });
  const close = (slug: string) =>
    setOpened((current) => (current?.slug === slug ? null : current));

  const linkClass = "block py-3 text-lg text-nyoki-navy hover:underline hover:underline-offset-4";

  return (
    <nav aria-label="Departments">
      <ul className="flex flex-wrap items-center justify-center gap-x-8 md:justify-start">
        {groups.map((group) => (
          <li
            key={group.slug}
            onMouseEnter={() => open(group.slug)}
            onMouseLeave={() => close(group.slug)}
            onFocus={() => open(group.slug)}
            onBlur={(event) => {
              // Only close when focus has left the department entirely, not
              // when it moves between the department and its own links.
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                close(group.slug);
              }
            }}
          >
            <Link href={`/shop/${group.slug}`} className={linkClass}>
              {group.name}
            </Link>

            {group.children.length > 0 ? (
              <div
                role="group"
                aria-label={`${group.name} categories`}
                hidden={openSlug !== group.slug}
                className="absolute inset-x-0 top-full z-40 border-b border-nyoki-light-slate bg-nyoki-beige shadow-lg"
              >
                <ul className="mx-auto grid max-w-shop grid-cols-2 gap-x-8 gap-y-2 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:grid-cols-4">
                  {group.children.map((child) => (
                    <li key={child.slug}>
                      <Link
                        href={`/shop/${child.slug}`}
                        className="block py-1 text-sm text-nyoki-navy hover:underline hover:underline-offset-4"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}

        <li>
          <Link href="/shop" className={linkClass}>
            Everything
          </Link>
        </li>
      </ul>
    </nav>
  );
}
