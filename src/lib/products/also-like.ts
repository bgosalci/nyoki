/**
 * "You may also like" on a product's page: Njomza's own choices first, in her
 * order, then pieces from the same categories to fill the row - so choosing
 * one or two never leaves it short, and choosing nothing keeps it automatic.
 */

export const ALSO_LIKE_LIMIT = 4;

export function alsoLike<T extends { id: string }>({ chosen, automatic }: { chosen: readonly T[]; automatic: readonly T[] }): T[] {
  const shown = chosen.slice(0, ALSO_LIKE_LIMIT);
  const taken = new Set(shown.map((piece) => piece.id));
  for (const piece of automatic) {
    if (shown.length >= ALSO_LIKE_LIMIT) break;
    if (taken.has(piece.id)) continue;
    taken.add(piece.id);
    shown.push(piece);
  }
  return shown;
}

/**
 * The chosen pieces as posted by the product form, in order. A piece given
 * twice, a blank, or the product itself is dropped quietly - none of them is
 * something to correct - but more than the row holds is refused.
 */
export function parseAlsoLikeIds(form: FormData, selfId: string | null): { ok: true; ids: string[] } | { ok: false; error: string } {
  const ids: string[] = [];
  for (const value of form.getAll("alsoLikeIds")) {
    if (typeof value !== "string") continue;
    const id = value.trim();
    if (id && id !== selfId && !ids.includes(id)) ids.push(id);
  }
  if (ids.length > ALSO_LIKE_LIMIT) return { ok: false, error: `Choose at most ${ALSO_LIKE_LIMIT} pieces.` };
  return { ok: true, ids };
}

/**
 * The order to offer pieces in when choosing one for a product's "You may
 * also like": those sharing one of its categories first, then those in the
 * same group (anything sharing a category above), then everything else - so
 * replacing a Christmas card starts with Christmas cards, then other cards,
 * and a cardigan comes last. Within each, the order they came in is kept.
 */
export function closestFirst<T extends { categoryIds: readonly string[] }>(
  pieces: readonly T[],
  categoryIds: readonly string[],
  categories: readonly { id: string; parentId: string | null }[],
): T[] {
  const parents = new Map(categories.map((category) => [category.id, category.parentId]));

  // A category and everything above it. A tree that loops stops where it
  // comes round again.
  const lineage = (ids: readonly string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      let at: string | null | undefined = id;
      while (at && !seen.has(at)) {
        seen.add(at);
        at = parents.get(at);
      }
    }
    return seen;
  };

  const own = new Set(categoryIds);
  const family = lineage(categoryIds);
  const distance = (piece: T) => {
    if (piece.categoryIds.some((id) => own.has(id))) return 0;
    for (const id of lineage(piece.categoryIds)) if (family.has(id)) return 1;
    return 2;
  };

  // Array.prototype.sort is stable, so each tier keeps the order given.
  return pieces
    .map((piece) => ({ piece, distance: distance(piece) }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ piece }) => piece);
}
