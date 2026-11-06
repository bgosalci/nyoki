"use client";

import { useEffect, useId, useRef, useState } from "react";

import { TilePhoto, type ChooserItem } from "@/components/admin/photo-chooser";
import { ui } from "@/lib/brand/ui";
import { matchesEveryWord } from "@/lib/search";

export interface PhotoMultiChange {
  added: string[];
  removed: string[];
}

/**
 * Choosing many things from many by looking at them: `PhotoChooser`'s tiles
 * and search, each tile ticked or not, saved together.
 *
 * It hands back what changed, never the whole set, so nothing it was not told
 * about is touched. While a search is narrowed, Select and Clear act on what
 * it shows; a tick the search has hidden stays ticked.
 *
 * Every item is shown, however many, as the chooser's are: next/image fetches
 * a photo as it scrolls into view.
 *
 * Ticking dozens is work, so one Escape will not throw it away. Chrome lets a
 * page refuse Escape only once: pressed again it shuts the dialog itself,
 * firing `close` and no `cancel`, which is heard here as meant. Unheard, the
 * dialog was shut while React held it open, and nothing could open it again.
 */
export function PhotoMultiChooser({
  open,
  title,
  items,
  chosen,
  problem,
  onSave,
  onCancel,
}: {
  open: boolean;
  title: string;
  items: ChooserItem[];
  /** What is ticked as it opens. */
  chosen: readonly string[];
  /** Why the last save did not work; the ticks stay, to try again. */
  problem?: string;
  onSave: (change: PhotoMultiChange) => Promise<void> | void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [baseline, setBaseline] = useState<ReadonlySet<string>>(() => new Set(chosen));
  const [ticked, setTicked] = useState<ReadonlySet<string>>(baseline);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Reset during render: it stays mounted between openings, and each starts
  // from what is chosen then. Held rather than read from the prop, so a page
  // refreshed underneath it cannot change what counts as a change.
  const [openedWith, setOpenedWith] = useState(open);
  if (open !== openedWith) {
    const fresh = new Set(chosen);
    setOpenedWith(open);
    setBaseline(fresh);
    setTicked(fresh);
    setQuery("");
    setSaving(false);
  }

  if (!open) return null;

  const matches = items.filter((item) => matchesEveryWord(`${item.title} ${item.searchText}`, query));
  const narrowed = query.trim().length > 0;

  const added = items.filter((item) => ticked.has(item.id) && !baseline.has(item.id)).map((item) => item.id);
  const removed = items.filter((item) => baseline.has(item.id) && !ticked.has(item.id)).map((item) => item.id);
  const changed = added.length > 0 || removed.length > 0;

  const summary = changed
    ? [added.length > 0 ? `${added.length} to add` : null, removed.length > 0 ? `${removed.length} to take out` : null].filter(Boolean).join(", ")
    : "Nothing changed yet";

  function toggle(id: string) {
    const next = new Set(ticked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTicked(next);
  }

  /** Everything shown, ticked or not: the whole list, or what the search found. */
  function setShown(on: boolean) {
    const next = new Set(ticked);
    for (const item of matches) {
      if (on) next.add(item.id);
      else next.delete(item.id);
    }
    setTicked(next);
  }

  async function save() {
    if (saving) return;
    if (!changed) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      await onSave({ added, removed });
    } finally {
      setSaving(false);
    }
  }

  const smallButton = `rounded-md px-3 py-2 text-xs ${ui.buttonSecondary}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!changed) onCancel();
      }}
      onClose={onCancel}
      className={`m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl rounded-lg border p-6 shadow-xl ${ui.scrim} ${ui.panel} ${ui.rule}`}
    >
      <h2 id={titleId} className={`text-lg font-semibold ${ui.heading}`}>
        {title}
      </h2>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          role="searchbox"
          aria-label="Search"
          placeholder="Search by name, code or category"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Enter here is for the search, not for saving.
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          autoComplete="off"
          className={`min-w-48 flex-1 rounded-md border px-3 py-2 text-sm outline-none ${ui.input}`}
        />
        <button type="button" onClick={() => setShown(true)} className={smallButton}>
          {narrowed ? `Select these ${matches.length}` : `Select all ${matches.length}`}
        </button>
        <button type="button" onClick={() => setShown(false)} className={smallButton}>
          {narrowed ? `Clear these ${matches.length}` : "Clear all"}
        </button>
      </div>

      {matches.length === 0 ? (
        <p className={`mt-6 text-sm ${ui.mutedOnPanel}`}>Nothing matches that. Try one word, or fewer.</p>
      ) : (
        <ul className="mt-4 grid max-h-[40dvh] grid-cols-2 gap-3 overflow-y-auto sm:max-h-[50dvh] sm:grid-cols-4">
          {matches.map((item) => (
            <li key={item.id}>
              <label className={`relative flex h-full cursor-pointer flex-col gap-2 rounded-md border p-2 ${ui.rule} ${ticked.has(item.id) ? ui.navActive : ""}`}>
                <input
                  type="checkbox"
                  checked={ticked.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className={`absolute top-3.5 left-3.5 z-10 size-5 ${ui.checkbox}`}
                />
                <TilePhoto url={item.imageUrl} />
                <span className="text-xs leading-snug font-medium">{item.title}</span>
                {item.details.map((detail) => (
                  <span key={detail} className={`text-xs ${ui.mutedOnPanel}`}>
                    {detail}
                  </span>
                ))}
              </label>
            </li>
          ))}
        </ul>
      )}

      {problem ? (
        <p role="status" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {problem}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <p aria-live="polite" className={`mr-auto text-sm ${ui.mutedOnPanel}`}>
          {summary}
        </p>
        <button type="button" onClick={onCancel} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonSecondary}`}>
          Cancel
        </button>
        <button type="button" disabled={saving} onClick={() => void save()} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonPrimary}`}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </dialog>
  );
}
