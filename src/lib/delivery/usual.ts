import { findInLineage, type CategoryNode } from "@/lib/categories/lineage";
import type { PostageFacts } from "@/lib/delivery/parcel";
import type { ParcelSize } from "@/lib/delivery/royal-mail";

/** A category with its usual postage, as the lookup needs it. */
export interface UsualCategory extends CategoryNode {
  name: string;
  usualGrams: number | null;
  usualParcelSize: ParcelSize | null;
  usualThicknessMm: number | null;
}

export interface Usual extends PostageFacts {
  categoryId: string;
  categoryName: string;
}

/**
 * The usual postage a piece goes by: its nearest category with any set - its
 * own, then up the tree, each of its categories in turn - taken whole. Read
 * live, so changing a category's usual moves every piece using it.
 */
export function usualFor(categoryIds: readonly string[], categories: readonly UsualCategory[]): Usual | null {
  return findInLineage(categoryIds, categories, (category) =>
    category.usualGrams !== null || category.usualParcelSize !== null || category.usualThicknessMm !== null
      ? { categoryId: category.id, categoryName: category.name, grams: category.usualGrams, size: category.usualParcelSize, mm: category.usualThicknessMm }
      : null,
  );
}
