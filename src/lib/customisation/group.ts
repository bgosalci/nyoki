import { findInLineage, type CategoryNode } from "@/lib/categories/lineage";

export type { CategoryNode };

/**
 * Which products can be customised: cards and bookmarks, and nothing else.
 *
 * Told by the categories a piece is in: a category called Cards or Bookmarks
 * (singular or plural), itself or anywhere above it. So a type beneath Cards
 * counts, and so does a Bookmarks type filed under Accessories. There is no
 * Bookmarks category yet; one made later is recognised by its address.
 */

/** What the piece is called on its page: "+80p a card", "Single bookmark". */
export interface ItemNoun {
  one: string;
  many: string;
}

const CARD: ItemNoun = { one: "card", many: "cards" };
const BOOKMARK: ItemNoun = { one: "bookmark", many: "bookmarks" };

const GROUPS: Record<string, ItemNoun> = { cards: CARD, card: CARD, bookmarks: BOOKMARK, bookmark: BOOKMARK };

/** What the piece is, if it is a card or a bookmark; otherwise null. */
export function customisationGroup(categoryIds: readonly string[], categories: readonly CategoryNode[]): ItemNoun | null {
  return findInLineage(categoryIds, categories, (category) => GROUPS[category.slug]);
}
