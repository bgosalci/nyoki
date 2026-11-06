"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ui } from "@/lib/brand/ui";
import { categoriesMatching, categoryPaths } from "@/lib/categories/path";
import { flattenTree } from "@/lib/categories/tree";

export interface BulkCategoryRow {
  id: string;
  categoryIds: string[];
}

export interface BulkCategory {
  id: string;
  name: string;
  parentId: string | null;
}

/** How many of them a category already holds. */
function holdingNote(holding: number, total: number): string | null {
  if (holding === 0) return null;
  if (total === 1) return "in it";
  return holding === total ? "all in it" : `${holding} of ${total} in it`;
}

/**
 * Filing everything chosen in the products list in a category, or taking it
 * out of one.
 *
 * Both only touch the categories ticked here: a piece keeps every other one
 * it is in, since a piece is often in several. Adding offers the whole tree,
 * as a product's own Details tab does, with one that already holds them all
 * shut; taking out offers only the categories they are in.
 */
export function BulkCategoryDialog({
  open,
  mode,
  rows,
  categories,
  onApply,
  onCancel,
}: {
  open: boolean;
  mode: "add" | "remove";
  rows: BulkCategoryRow[];
  categories: BulkCategory[];
  onApply: (categoryIds: string[]) => Promise<void> | void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Reset during render, as the price dialog does: it stays mounted between
  // openings, and each should start clean.
  const [openedWith, setOpenedWith] = useState(open);
  if (open !== openedWith) {
    setOpenedWith(open);
    setTicked(new Set());
    setQuery("");
    setAsked(false);
    setSaving(false);
  }

  if (!open) return null;

  const adding = mode === "add";
  const paths = categoryPaths(categories);
  const holding = (id: string) => rows.filter((row) => row.categoryIds.includes(id)).length;

  const tree = flattenTree(categories);
  const offered = adding ? tree : tree.filter(({ row }) => holding(row.id) > 0).map(({ row }) => ({ row, depth: 0 }));
  const shown = categoriesMatching(offered.map(({ row }) => row), query, paths);
  const visible = offered.filter(({ row }) => shown.has(row.id));
  // In the tree's order, whatever order they were ticked in.
  const chosen = offered.filter(({ row }) => ticked.has(row.id)).map(({ row }) => row.id);

  const count = `${rows.length} ${rows.length === 1 ? "product" : "products"}`;
  const verb = adding ? "Add" : "Remove";

  function toggle(id: string) {
    const next = new Set(ticked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTicked(next);
    setAsked(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (chosen.length === 0) {
      setAsked(true);
      return;
    }
    setSaving(true);
    try {
      await onApply(chosen);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className={`m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg rounded-lg border p-6 shadow-xl ${ui.scrim} ${ui.panel} ${ui.rule}`}
    >
      <h2 id={titleId} className={`text-lg font-semibold ${ui.heading}`}>
        {adding ? `Add ${count} to a category` : `Remove ${count} from a category`}
      </h2>
      <p className={`mt-2 text-sm ${ui.mutedOnPanel}`}>
        {adding ? "They stay in the categories they are in already." : "They stay in any others, and on the shop."}
      </p>

      {offered.length === 0 ? (
        <>
          <p className={`mt-4 text-sm ${ui.mutedOnPanel}`}>No categories yet. Add some under Categories and they will appear here.</p>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={onCancel} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonSecondary}`}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={(event) => void submit(event)}>
          {/* First in the dialog, so it takes the focus as it opens. */}
          <input
            type="search"
            aria-label="Find a category"
            placeholder="Find a category"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            // Enter here is for the search, not for saving.
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            autoComplete="off"
            className={`mt-4 w-full rounded-md border px-3 py-2 text-sm outline-none ${ui.input}`}
          />

          {visible.length === 0 ? <p className={`mt-3 text-sm ${ui.mutedOnPanel}`}>Nothing matches that.</p> : null}

          <ul className="mt-3 flex max-h-[40dvh] flex-col gap-1.5 overflow-y-auto">
            {visible.map(({ row, depth }) => {
              const note = holdingNote(holding(row.id), rows.length);
              // Already holding them all, there is nothing to add it to.
              const full = adding && holding(row.id) === rows.length;
              return (
                <li key={row.id} style={{ paddingLeft: depth * 1.5 + "rem" }}>
                  <label className="flex items-center gap-2.5 py-0.5 text-sm">
                    <input
                      type="checkbox"
                      checked={ticked.has(row.id)}
                      disabled={full}
                      onChange={() => toggle(row.id)}
                      className={`size-4 shrink-0 ${ui.checkbox}`}
                    />
                    <span>{adding ? row.name : paths.get(row.id)}</span>
                    {note ? <span className={`ml-auto shrink-0 pr-2 text-xs ${ui.mutedOnPanel}`}>{note}</span> : null}
                  </label>
                </li>
              );
            })}
          </ul>

          {/* The ticks stay when a search hides them, so what will happen is always said. */}
          {chosen.length > 0 ? (
            <p className={`mt-3 text-xs ${ui.mutedOnPanel}`}>
              {adding ? "Adding to" : "Taking out of"}: {chosen.map((id) => paths.get(id)).join("; ")}
            </p>
          ) : null}
          {asked ? <p className="mt-3 text-xs text-red-600 dark:text-red-400">Choose a category first.</p> : null}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonSecondary}`}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonPrimary}`}>
              {saving ? "Saving…" : `${verb} ${count}`}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
