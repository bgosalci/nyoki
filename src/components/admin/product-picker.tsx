"use client";

import { useId, useState } from "react";

import { PhotoChooser } from "@/components/admin/photo-chooser";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ui } from "@/lib/brand/ui";

export interface PickerProduct {
  id: string;
  name: string;
  image: { url: string; alt: string | null } | null;
}

/**
 * Choose a product by looking at it.
 *
 * Replaces a select of a few hundred names: picking the photograph that will
 * lead the shop from a dropdown means choosing something you cannot see.
 *
 * The value lives in a hidden input, so the surrounding form posts it like
 * any other field and nothing here needs to know what it is for. The chooser
 * itself is the admin's shared PhotoChooser.
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
  const labelId = useId();

  // A piece archived since it was chosen is no longer in the list. Its id is
  // still what the form should post, so the absence shows as a bare name
  // rather than quietly reverting the choice.
  const current = products.find((product) => product.id === chosen) ?? null;

  function choose(productId: string | null) {
    setChosen(productId);
    setOpen(false);
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

      <PhotoChooser
        open={open}
        title="Choose a piece"
        items={products.map((product) => ({
          id: product.id,
          title: product.name,
          details: [],
          imageUrl: product.image?.url ?? null,
          searchText: product.name,
        }))}
        selectedId={chosen}
        onChoose={choose}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
