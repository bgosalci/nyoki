export interface CategoryNode {
  id: string;
  slug: string;
  parentId: string | null;
}

/**
 * The first answer `pick` gives for any of a piece's categories or anything
 * above them - each category first, then its parent, and so on up - or null.
 *
 * How the shop tells what a piece is: a card is anything filed under Cards,
 * however deep, and clothes anything under Clothes.
 */
export function findInLineage<T, N extends CategoryNode = CategoryNode>(
  categoryIds: readonly string[],
  categories: readonly N[],
  pick: (category: N) => T | null | undefined,
): T | null {
  const byId = new Map(categories.map((category) => [category.id, category]));

  for (const id of categoryIds) {
    const seen = new Set<string>();
    let category = byId.get(id);
    // A tree that loops is a mistake elsewhere; here it must not hang.
    while (category && !seen.has(category.id)) {
      const found = pick(category);
      if (found !== null && found !== undefined) return found;
      seen.add(category.id);
      category = category.parentId ? byId.get(category.parentId) : undefined;
    }
  }

  return null;
}
