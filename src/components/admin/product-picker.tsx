"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ui } from "@/lib/brand/ui";

export interface PickerProduct {
  id: string;
  name: string;
  image: { url: string; alt: string | null } | null;
}

/**
 * The catalogue runs to a few hundred pieces, and every tile is an optimised
 * image request. Showing a capped page of them and asking for a word is
 * kinder than fetching the lot the moment the chooser opens.
 */
const VISIBLE = 60;

/**
 * Choose a product by looking at it.
 *
 * Replaces a select of a few hundred names: picking the photograph that will
 * lead the shop from a dropdown means choosing something you cannot see.
 *
 * The value lives in a hidden input, so the surrounding form posts it like
 * any other field and nothing here needs to know what it is for.
 */
export function ProductPicker({
  name,
  label,
  products,
  value,
  emptyLabel,
  hint,
  error,
}: {
  name: string;
  label: string;
  products: PickerProduct[];
  value: string | null;
  /** What it means to choose nothing - "the newest piece", "no photo", … */
  emptyLabel: string;
  hint?: string;
  error?: string;
}) {
  const [chosen, setChosen] = useState<string | null>(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const labelId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // A piece archived since it was chosen is no longer in the list. Its id is
  // still what the form should post, so the absence shows as a bare name
  // rather than quietly reverting the choice.
  const current = products.find((product) => product.id === chosen) ?? null;

  const matches = query.trim().length > 0
    ? products.filter((product) => product.name.toLowerCase().includes(query.trim().toLowerCase()))
    : products;
  const shown = matches.slice(0, VISIBLE);

  function choose(productId: string | null) {
    setChosen(productId);
    setOpen(false);
    setQuery("");
  }

  return (
    // A group rather than a labelled control: this is a preview, a button and
    // a hidden input working together. Pointed at the button instead, the
    // label renames it and "Choose" stops being announced at all.
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
      <p id={labelId} className="text-sm font-medium">
        {label}
      </p>

      <input type="hidden" name={name} value={chosen ?? ""} />

      <div className={`flex items-center gap-3 rounded-md border p-2 ${ui.rule}`}>
        {chosen ? (
          <>
            <ProductThumbnail image={current?.image ?? null} />
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {current?.name ?? "A piece no longer on the shop"}
            </p>
          </>
        ) : (
          <p className={`min-w-0 flex-1 truncate px-1 text-sm ${ui.mutedOnPage}`}>{emptyLabel}</p>
        )}

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}
          >
            Choose
          </button>

          {chosen ? (
            <button
              type="button"
              onClick={() => choose(null)}
              className={`rounded-md px-3 py-1.5 text-sm underline underline-offset-4 ${ui.mutedOnPage}`}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {hint ? <p className={`text-xs ${ui.mutedOnPage}`}>{hint}</p> : null}
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

      {open ? (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
          className={`m-auto max-h-[80dvh] w-[calc(100%-2rem)] max-w-3xl rounded-lg border p-6 shadow-xl ${ui.scrim} ${ui.panel} ${ui.rule}`}
        >
          <h2 id={titleId} className={`text-lg font-semibold ${ui.heading}`}>
            Choose a piece
          </h2>

          <input
            type="search"
            role="searchbox"
            aria-label="Search pieces by name"
            placeholder="Search by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`mt-4 w-full rounded-md border px-3 py-2 text-sm outline-none ${ui.input}`}
          />

          <p className={`mt-2 text-xs ${ui.mutedOnPage}`}>
            {matches.length > VISIBLE
              ? `Showing ${VISIBLE} of ${matches.length}. Type a word to narrow it.`
              : `${matches.length} ${matches.length === 1 ? "piece" : "pieces"}`}
          </p>

          <ul className="mt-4 grid max-h-[45dvh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
            {shown.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => choose(product.id)}
                  className={`flex w-full flex-col gap-2 rounded-md border p-2 text-left ${ui.rule} ${
                    product.id === chosen ? ui.navActive : ""
                  }`}
                >
                  <span className="relative block aspect-square w-full overflow-hidden rounded bg-nyoki-soft-ash">
                    {product.image ? (
                      <Image
                        src={product.image.url}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 12rem, 45vw"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="line-clamp-2 text-xs leading-snug">{product.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonSecondary}`}
            >
              Cancel
            </button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
