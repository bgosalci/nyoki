"use client";

import { useId, useState } from "react";

import { ui } from "@/lib/brand/ui";
import { flattenTree } from "@/lib/categories/tree";

export interface ChooserCategory {
  id: string;
  name: string;
  parentId: string | null;
}

/**
 * A product's categories: what is chosen, shown by its place in the tree
 * ("Cards › Christmas Cards"), with the whole list a click away rather than
 * forty-odd checkboxes down the page at all times.
 *
 * The list is always in the page, only hidden, so its ticks are posted with
 * the form - and read by the unsaved-changes warning - whether it is open or
 * not. Ticks are held in state, so the summary follows them as they change.
 */
export function CategoryChooser({
  categories,
  chosen: initial,
  error,
}: {
  categories: ChooserCategory[];
  chosen: string[];
  error?: string;
}) {
  const [chosen, setChosen] = useState(() => new Set(initial));
  const [open, setOpen] = useState(false);
  const listId = useId();
  const legendId = useId();

  const tree = flattenTree(categories);
  const byId = new Map(categories.map((category) => [category.id, category]));

  /** "Cards › Christmas Cards": a name is not always enough on its own. */
  const path = (id: string) => {
    const names: string[] = [];
    const seen = new Set<string>();
    for (let at = byId.get(id); at && !seen.has(at.id); at = at.parentId ? byId.get(at.parentId) : undefined) {
      seen.add(at.id);
      names.unshift(at.name);
    }
    return names.join(" › ");
  };

  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // In the tree's own order, so the summary reads as the list does.
  const picked = tree.filter(({ row }) => chosen.has(row.id));

  return (
    <fieldset aria-labelledby={legendId} className="flex flex-col gap-3">
      <legend id={legendId} className="text-sm font-semibold">
        Categories
      </legend>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

      {tree.length === 0 ? (
        <p className={`text-sm ${ui.mutedOnPage}`}>No categories yet. Add some under Categories and they will appear here.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {picked.length === 0 ? (
              <p className={`text-sm ${ui.mutedOnPage}`}>None chosen yet.</p>
            ) : (
              <ul aria-label="Chosen categories" className="flex flex-wrap gap-2">
                {picked.map(({ row }) => (
                  <li key={row.id} className={`flex items-center gap-1 rounded-md border py-1 pr-1 pl-2.5 text-sm ${ui.card} ${ui.rule}`}>
                    <span>{path(row.id)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${row.name}`}
                      onClick={() => toggle(row.id)}
                      className={`rounded px-1.5 ${ui.navItem}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setOpen((current) => !current)}
              className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}
            >
              {open ? "Done" : picked.length === 0 ? "Choose categories" : "Change categories"}
            </button>
          </div>

          <ul id={listId} hidden={!open} className="flex flex-col gap-1.5">
            {tree.map(({ row, depth }) => (
              <li key={row.id} style={{ paddingLeft: depth * 1.5 + "rem" }}>
                <label className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={row.id}
                    checked={chosen.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className={`size-4 ${ui.checkbox}`}
                  />
                  {row.name}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </fieldset>
  );
}
