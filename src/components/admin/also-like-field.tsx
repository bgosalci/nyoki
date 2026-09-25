"use client";

import { useId, useState } from "react";

import { PhotoChooser } from "@/components/admin/photo-chooser";
import type { PickerProduct } from "@/components/admin/product-picker";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ui } from "@/lib/brand/ui";
import { ALSO_LIKE_LIMIT, alsoLike } from "@/lib/products/also-like";

export interface ChosenPiece extends PickerProduct {
  /** Whether the shop shows it: one taken off since is skipped on the page. */
  onShop: boolean;
}

/**
 * The pieces under "You may also like" on a product's page, shown as the
 * page shows them now - Njomza's choices first, the rest picked automatically
 * from the same categories (`alsoLike`, the page's own rule) - each marked
 * which it is, and each changeable.
 *
 * Changing one makes the row hers: the four she sees, with her choice in its
 * place, so what she was looking at is what stays. Back to automatic lets the
 * categories pick again. Posted in order as `alsoLikeIds`.
 */
export function AlsoLikeField({
  options,
  automatic,
  chosen: initial,
  error,
}: {
  /** Every piece on the shop that could be chosen. */
  options: PickerProduct[];
  /** What the page picks by itself for this product, best first. */
  automatic: PickerProduct[];
  chosen: ChosenPiece[];
  error?: string;
}) {
  const [chosen, setChosen] = useState<ChosenPiece[]>(initial);
  const [slot, setSlot] = useState<number | null>(null);
  const labelId = useId();

  const onShop = chosen.filter((piece) => piece.onShop);
  const offShop = chosen.filter((piece) => !piece.onShop);
  const mine = new Set(onShop.map((piece) => piece.id));
  const shown = alsoLike({ chosen: onShop, automatic });
  const inRow = new Set(shown.map((piece) => piece.id));

  function choose(id: string) {
    const at = slot;
    setSlot(null);
    const option = options.find((piece) => piece.id === id);
    if (!option || at === null) return;
    // The row becomes hers: the pieces she sees, with this one in its place.
    const row: ChosenPiece[] = shown.map((piece) => ({ ...piece, onShop: true }));
    if (at < row.length) row[at] = { ...option, onShop: true };
    else row.push({ ...option, onShop: true });
    setChosen(row.slice(0, ALSO_LIKE_LIMIT));
  }

  const smallButton = `rounded-md px-2.5 py-1 text-xs ${ui.buttonSecondary}`;

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-3">
      <p id={labelId} className="text-sm font-semibold">
        You may also like
      </p>

      {chosen.map((piece) => (
        <input key={piece.id} type="hidden" name="alsoLikeIds" value={piece.id} />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <p className={`text-sm ${ui.mutedOnPage}`}>
          {chosen.length === 0
            ? "Picked automatically from the same categories. Change any to choose your own."
            : "Your choice, shown in this order. Any gap is filled from the same categories."}
        </p>
        {chosen.length > 0 ? (
          <button type="button" onClick={() => setChosen([])} className={`text-sm underline underline-offset-4 ${ui.mutedOnPage}`}>
            Back to automatic
          </button>
        ) : null}
      </div>

      <ul aria-label="Shown on the product's page" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: ALSO_LIKE_LIMIT }, (_, index) => shown[index] ?? null).map((piece, index) =>
          piece ? (
            <li key={piece.id} className={`flex flex-col gap-2 rounded-md border p-2 ${ui.rule}`}>
              <ProductThumbnail image={piece.image} size="large" />
              <span data-name className="text-sm leading-snug">
                {piece.name}
              </span>
              <span data-how className={`text-xs ${ui.mutedOnPage}`}>
                {mine.has(piece.id) ? "Your choice" : "Automatic"}
              </span>
              <button type="button" aria-label={`Change ${piece.name}`} onClick={() => setSlot(index)} className={`self-start ${smallButton}`}>
                Change
              </button>
            </li>
          ) : (
            <li key={`empty-${index}`} className={`flex min-h-28 items-center justify-center rounded-md border border-dashed p-2 ${ui.rule}`}>
              <button type="button" onClick={() => setSlot(index)} className={smallButton}>
                Add a piece
              </button>
            </li>
          ),
        )}
      </ul>

      {offShop.map((piece) => (
        <p key={piece.id} className={`flex flex-wrap items-center gap-2 text-xs ${ui.mutedOnPage}`}>
          {piece.name} is not on the shop, so it is skipped.
          <button
            type="button"
            aria-label={`Remove ${piece.name}`}
            onClick={() => setChosen(chosen.filter((other) => other.id !== piece.id))}
            className="underline underline-offset-4"
          >
            Remove
          </button>
        </p>
      ))}

      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

      <PhotoChooser
        open={slot !== null}
        title={slot !== null && shown[slot] ? `Instead of ${shown[slot].name}` : "Add a piece"}
        items={options
          .filter((piece) => !inRow.has(piece.id))
          .map((piece) => ({ id: piece.id, title: piece.name, details: [], imageUrl: piece.image?.url ?? null, searchText: piece.name }))}
        onChoose={choose}
        onCancel={() => setSlot(null)}
      />
    </div>
  );
}
