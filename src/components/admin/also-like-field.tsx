"use client";

import { useId, useState } from "react";

import { PhotoChooser } from "@/components/admin/photo-chooser";
import type { PickerProduct } from "@/components/admin/product-picker";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ui } from "@/lib/brand/ui";
import { ALSO_LIKE_LIMIT } from "@/lib/products/also-like";

export interface ChosenPiece extends PickerProduct {
  /** Whether the shop shows it: one taken off since is skipped on the page. */
  onShop: boolean;
}

const WORDS = ["none", "one", "two", "three", "four"];

/**
 * The pieces shown under "You may also like" on a product's page. Automatic
 * until Njomza chooses - pieces from the same categories - and when she
 * chooses, hers come first, in her order, with any gap filled automatically
 * (`alsoLike`). Chosen by photo, with the admin's PhotoChooser; posted in
 * order as `alsoLikeIds`.
 */
export function AlsoLikeField({ options, chosen: initial, error }: { options: PickerProduct[]; chosen: ChosenPiece[]; error?: string }) {
  const [chosen, setChosen] = useState<ChosenPiece[]>(initial);
  const [choosing, setChoosing] = useState(false);
  const labelId = useId();

  const taken = new Set(chosen.map((piece) => piece.id));
  const full = chosen.length >= ALSO_LIKE_LIMIT;

  function add(id: string) {
    setChoosing(false);
    const option = options.find((piece) => piece.id === id);
    if (option && !taken.has(id) && !full) setChosen([...chosen, { ...option, onShop: true }]);
  }

  const buttonClass = `rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`;

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-3">
      <p id={labelId} className="text-sm font-semibold">
        You may also like
      </p>

      {chosen.map((piece) => (
        <input key={piece.id} type="hidden" name="alsoLikeIds" value={piece.id} />
      ))}

      {chosen.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className={`text-sm ${ui.mutedOnPage}`}>Chosen automatically: pieces from the same categories.</p>
          <button type="button" onClick={() => setChoosing(true)} className={buttonClass}>
            Choose pieces
          </button>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {chosen.map((piece) => (
              <li key={piece.id} className={`flex flex-col gap-2 rounded-md border p-2 ${ui.rule}`}>
                <ProductThumbnail image={piece.image} size="large" />
                <span className="text-sm leading-snug">{piece.name}</span>
                {piece.onShop ? null : <span className={`text-xs ${ui.mutedOnPage}`}>Not on the shop, so skipped</span>}
                <button
                  type="button"
                  aria-label={`Remove ${piece.name}`}
                  onClick={() => setChosen(chosen.filter((other) => other.id !== piece.id))}
                  className={`self-start text-xs underline underline-offset-4 ${ui.mutedOnPage}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            {full ? (
              <p className={`text-sm ${ui.mutedOnPage}`}>All four chosen.</p>
            ) : (
              <button type="button" onClick={() => setChoosing(true)} className={buttonClass}>
                Add a piece
              </button>
            )}
            <button type="button" onClick={() => setChosen([])} className={`text-sm underline underline-offset-4 ${ui.mutedOnPage}`}>
              Back to automatic
            </button>
          </div>
        </>
      )}

      <p className={`text-xs ${ui.mutedOnPage}`}>
        Up to four, shown in the order chosen ({WORDS[chosen.length]} so far). Any left are filled from the same
        categories.
      </p>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

      <PhotoChooser
        open={choosing}
        title="Choose a piece to suggest"
        items={options
          .filter((piece) => !taken.has(piece.id))
          .map((piece) => ({ id: piece.id, title: piece.name, details: [], imageUrl: piece.image?.url ?? null, searchText: piece.name }))}
        onChoose={add}
        onCancel={() => setChoosing(false)}
      />
    </div>
  );
}
