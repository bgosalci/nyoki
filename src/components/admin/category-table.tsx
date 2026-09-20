"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { Th } from "@/components/admin/th";
import { ui } from "@/lib/brand/ui";
import { visibleBranches, type Branch } from "@/lib/categories/collapse";

const STORAGE_KEY = "nyoki-admin-categories-collapsed";

export interface CategoryTableRow {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

/**
 * Which groups are shut is external state React does not own, so it is read
 * through useSyncExternalStore rather than copied into state by an effect.
 * The snapshot is the stored string itself: two reads of an unchanged
 * preference are equal by value, which is what the hook compares.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // Private windows and blocked site data both throw. Open everything.
    return "";
  }
}

/** The server cannot know this browser's preference, so it renders the tree open. */
function getServerSnapshot(): string {
  return "";
}

function remember(ids: Iterable<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, [...ids].join(","));
  } catch {
    // Not remembering is a smaller problem than not working.
  }
  for (const listener of listeners) listener();
}

/**
 * The categories list, with each group able to be shut.
 *
 * The catalogue has a few groups and a long tail of types beneath them, which
 * makes the open list hard to scan. A shut group says how many rows it is
 * hiding rather than simply swallowing them, and the choice is remembered per
 * browser so a long list does not reopen itself on every visit.
 */
export function CategoryTable({ branches }: { branches: Branch<CategoryTableRow>[] }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const collapsed = useMemo(() => new Set(raw.length > 0 ? raw.split(",") : []), [raw]);

  const parents = useMemo(
    () => visibleBranches(branches, new Set()).filter((branch) => branch.hasChildren).map((branch) => branch.row.id),
    [branches],
  );

  const rows = visibleBranches(branches, collapsed);
  const shutCount = parents.filter((id) => collapsed.has(id)).length;

  function toggle(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    remember(next);
  }

  const controlClass = `rounded-md px-2.5 py-1 text-xs ${ui.buttonSecondary} disabled:opacity-40`;

  return (
    <div className="mt-6">
      {parents.length > 0 ? (
        <div className="mb-3 flex justify-end gap-2">
          <button type="button" onClick={() => remember([])} disabled={shutCount === 0} className={controlClass}>
            Expand all
          </button>
          <button
            type="button"
            onClick={() => remember(parents)}
            disabled={shutCount === parents.length}
            className={controlClass}
          >
            Collapse all
          </button>
        </div>
      ) : null}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Web address</Th>
            <Th align="right">Products</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ row, depth, hasChildren, childCount }) => {
            const shut = collapsed.has(row.id);

            return (
              <tr key={row.id} className={`border-b ${ui.tableRow}`}>
                <td className="py-3 pr-4">
                  <span style={{ paddingLeft: `${depth * 1.25}rem` }} className="flex items-center gap-1.5">
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggle(row.id)}
                        aria-expanded={!shut}
                        aria-label={`${shut ? "Expand" : "Collapse"} ${row.name}`}
                        className={`-my-1 rounded p-1 ${ui.navItem}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="size-4">
                          <path d={shut ? "m9 6 6 6-6 6" : "m6 9 6 6 6-6"} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ) : (
                      // Keeps the names of childless rows in line with the rest.
                      <span aria-hidden="true" className="size-6" />
                    )}

                    <Link href={`/admin/categories/${row.id}`} className="font-medium underline-offset-4 hover:underline">
                      {row.name}
                    </Link>

                    {shut ? <span className={`text-xs ${ui.mutedOnPage}`}>{childCount} hidden</span> : null}
                  </span>
                </td>
                <td className={`py-3 pr-4 font-mono text-xs ${ui.mutedOnPage}`}>/{row.slug}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{row.productCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
