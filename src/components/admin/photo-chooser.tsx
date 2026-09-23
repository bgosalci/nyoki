"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { ui } from "@/lib/brand/ui";

export interface ChooserItem {
  id: string;
  title: string;
  /** Lines under the title: a cost, an old price, a note. */
  details: string[];
  imageUrl: string | null;
  /** Every word worth finding it by - file names included - in any case. */
  searchText: string;
}

/**
 * Every tile is an optimised image request. A capped page and a word to
 * narrow it is kinder than fetching a few hundred the moment it opens.
 */
const VISIBLE = 60;

/**
 * Choosing one thing from many by looking at it: a modal of photographs with
 * a search.
 *
 * Shared by everything in the admin that picks by photo - a product for the
 * home page, a row of the old price lists for a piece's costs - so they look
 * and behave alike. It knows nothing about what it is choosing; it is handed
 * tiles and hands back an id.
 *
 * The search matches every word typed, in any order, against everything the
 * caller says an item can be found by - so a photo's file name, which often
 * says what the piece is when nothing else does, counts.
 */
export function PhotoChooser({
  open,
  title,
  items,
  selectedId = null,
  lead,
  onChoose,
  onCancel,
}: {
  open: boolean;
  title: string;
  items: ChooserItem[];
  selectedId?: string | null;
  /** Shown above the search - what is being matched, to compare against. */
  lead?: React.ReactNode;
  onChoose: (id: string) => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length === 0
    ? items
    : items.filter((item) => {
        const haystack = `${item.title} ${item.searchText}`.toLowerCase();
        return words.every((word) => haystack.includes(word));
      });
  const shown = matches.slice(0, VISIBLE);

  function close(then: () => void) {
    setQuery("");
    then();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close(onCancel);
      }}
      className={`m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-4xl rounded-lg border p-6 shadow-xl ${ui.scrim} ${ui.panel} ${ui.rule}`}
    >
      <h2 id={titleId} className={`text-lg font-semibold ${ui.heading}`}>
        {title}
      </h2>

      {lead ? <div className="mt-3">{lead}</div> : null}

      <input
        type="search"
        role="searchbox"
        aria-label="Search"
        placeholder="Search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={`mt-4 w-full rounded-md border px-3 py-2 text-sm outline-none ${ui.input}`}
      />

      <p className={`mt-2 text-xs ${ui.mutedOnPage}`}>
        {matches.length > VISIBLE
          ? `Showing ${VISIBLE} of ${matches.length}. Type a word to narrow it.`
          : `${matches.length} to choose from`}
      </p>

      {shown.length === 0 ? (
        <p className={`mt-6 text-sm ${ui.mutedOnPage}`}>Nothing matches that. Try one word, or fewer.</p>
      ) : (
        <ul className="mt-4 grid max-h-[50dvh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
          {shown.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={item.id === selectedId}
                onClick={() => close(() => onChoose(item.id))}
                className={`flex w-full flex-col gap-2 rounded-md border p-2 text-left ${ui.rule} ${
                  item.id === selectedId ? ui.navActive : ""
                }`}
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded bg-nyoki-soft-ash dark:bg-nyoki-navy">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt="" fill sizes="(min-width: 640px) 13rem, 45vw" className="object-cover" />
                  ) : null}
                </span>
                <span className="text-xs leading-snug font-medium">{item.title}</span>
                {item.details.map((detail) => (
                  <span key={detail} className={`text-xs ${ui.mutedOnPage}`}>
                    {detail}
                  </span>
                ))}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex justify-end">
        <button type="button" onClick={() => close(onCancel)} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonSecondary}`}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}
