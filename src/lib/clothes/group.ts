import { findInLineage, type CategoryNode } from "@/lib/categories/lineage";

const CLOTHES = new Set(["clothes", "clothing"]);

/**
 * Whether a piece is clothing, and so sold in colours and sizes with stock
 * of each, rather than described by its dimensions.
 *
 * Told by its categories, as a card is: a category called Clothes (or
 * Clothing), itself or anywhere above it - so every type beneath Clothes.
 */
export function isClothes(categoryIds: readonly string[], categories: readonly CategoryNode[]): boolean {
  return findInLineage(categoryIds, categories, (category) => CLOTHES.has(category.slug) || null) !== null;
}
