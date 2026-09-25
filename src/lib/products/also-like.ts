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
