import Link from "next/link";

import { filterHref } from "@/lib/products/filter-href";
import { ui } from "@/lib/brand/ui";
import { pillRows, type PillCategory } from "@/lib/products/category-pills";

const PATH = "/admin/products";

/**
 * Category filter as rows of pills: the groups, then the chosen group's types,
 * down to the selection. Each pill is a link, so choosing one is a navigation
 * and the choice lives in the address with the search and status.
 */
export function CategoryPills({
  categories,
  counts,
  selected,
  q,
  status,
}: {
  categories: PillCategory[];
  /** Products in each category's subtree, by category id. */
  counts: Record<string, number>;
  selected: string | null;
  q: string;
  status: string;
}) {
  if (categories.length === 0) return null;

  const rows = pillRows(categories, selected);
  const href = (category: string) => filterHref(PATH, { q, status, category });

  const pillClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition-colors ${active ? ui.pillActive : ui.pill}`;

  return (
    <div className="mt-4 flex flex-col gap-2">
      {rows.map((row, depth) => (
        <div
          key={row.parent?.id ?? "top"}
          role="group"
          aria-label={row.parent ? `Types of ${row.parent.name}` : "Groups"}
          className="flex flex-wrap items-center gap-2"
          style={{ paddingLeft: depth ? `${depth * 1}rem` : undefined }}
        >
          {depth === 0 ? (
            <Link href={filterHref(PATH, { q, status, category: "" })} aria-current={selected === null ? "true" : undefined} className={pillClass(selected === null)}>
              All
            </Link>
          ) : null}
          {row.items.map((category) => {
            const active = category.slug === row.activeSlug;
            return (
              <Link key={category.id} href={href(category.slug)} aria-current={active ? "true" : undefined} className={pillClass(active)}>
                {category.name}
                <span className={`ml-1.5 tabular-nums ${active ? "opacity-80" : ui.mutedOnPanel}`}>{counts[category.id] ?? 0}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
