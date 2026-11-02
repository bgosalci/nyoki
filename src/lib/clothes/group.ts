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

/**
 * What a piece is chosen by: its colours, whatever it is - a hairband as much
 * as a coat - and its sizes only as clothing. A piece outside Clothes keeps
 * any sizes it has, offered to nobody, for if it goes back.
 */
export function offeredAxes<T extends { colours: readonly unknown[]; sizes: readonly unknown[] }>(piece: T, clothes: boolean): T {
  return clothes ? piece : { ...piece, sizes: [] };
}

/** Whether its stock is kept per colour and size, and is their total, rather than typed in the Stock box. */
export function stockByVariant(piece: { colours: readonly string[]; sizes: readonly string[] }, clothes: boolean): boolean {
  const { colours, sizes } = offeredAxes(piece, clothes);
  return colours.length > 0 || sizes.length > 0;
}
