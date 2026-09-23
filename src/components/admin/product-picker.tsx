"use client";

import { useState } from "react";

import { PhotoField } from "@/components/admin/photo-field";

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
 * any other field and nothing here needs to know what it is for. The field
 * itself is the admin's shared PhotoField.
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

  return (
    <PhotoField
      label={label}
      name={name}
      items={products.map((product) => ({
        id: product.id,
        title: product.name,
        details: [],
        imageUrl: product.image?.url ?? null,
        searchText: product.name,
      }))}
      value={chosen}
      onChange={setChosen}
      emptyLabel={emptyLabel}
      // A piece archived since it was chosen is no longer in the list.
      missingLabel="A piece no longer on the shop"
      chooserTitle="Choose a piece"
      hint={hint}
      error={error}
    />
  );
}
