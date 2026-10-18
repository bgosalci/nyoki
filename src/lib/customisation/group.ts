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

export interface CategoryNode {
  id: string;
  slug: string;
  parentId: string | null;
}

/** What the piece is, if it is a card or a bookmark; otherwise null. */
export function customisationGroup(categoryIds: readonly string[], categories: readonly CategoryNode[]): ItemNoun | null {
  const byId = new Map(categories.map((category) => [category.id, category]));

  for (const id of categoryIds) {
    const seen = new Set<string>();
    let category = byId.get(id);
    // A tree that loops is a mistake elsewhere; here it must not hang.
    while (category && !seen.has(category.id)) {
      const group = GROUPS[category.slug];
      if (group) return group;
      seen.add(category.id);
      category = category.parentId ? byId.get(category.parentId) : undefined;
    }
  }

  return null;
}
