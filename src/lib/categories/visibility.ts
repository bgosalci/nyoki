import { chainTo } from "@/lib/products/category-pills";

export interface StatusNode {
  id: string;
  parentId: string | null;
  /** Switched on in the admin. */
  active: boolean;
}

/**
 * What keeps each category off the shop: itself, if it is inactive, or else
 * the nearest inactive category above it. A category on the shop has no
 * entry. An inactive department so takes every type inside it off the shop,
 * however their own switches are set, and switching it back on brings them
 * back as they were.
 *
 * A tree that loops cannot hang it: a category met twice on the way up
 * stops the climb.
 */
export function offShopBecause<T extends StatusNode>(categories: readonly T[]): Map<string, T> {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const cause = new Map<string, T | null>();

  const climb = (category: T, seen: Set<string>): T | null => {
    const known = cause.get(category.id);
    if (known !== undefined) return known;
    if (!category.active) return category;
    if (seen.has(category.id)) return null;
    seen.add(category.id);

    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    return parent ? climb(parent, seen) : null;
  };

  for (const category of categories) cause.set(category.id, climb(category, new Set()));

  return new Map([...cause].filter((entry): entry is [string, T] => entry[1] !== null));
}

/** The categories on the shop, in the order given: each active, and every one above it too. */
export function onShop<T extends StatusNode>(categories: readonly T[]): T[] {
  const off = offShopBecause(categories);
  return categories.filter((category) => !off.has(category.id));
}

/**
 * Each category on the shop's address, by id. A home page link to one off
 * the shop finds none, and goes to the whole shop until it is back.
 */
export function slugsOnShop(categories: readonly (StatusNode & { slug: string })[]): Map<string, string> {
  return new Map(onShop(categories).map((category) => [category.id, category.slug]));
}

/**
 * A piece's breadcrumb: down to the first of its categories still on the
 * shop, so it never leads to a page that is not there. A piece in none
 * has none.
 */
export function shopTrail<T extends StatusNode & { slug: string; name: string }>(
  categories: readonly T[],
  categoryIds: readonly string[],
): T[] {
  const shown = onShop(categories);
  const own = categoryIds.map((id) => shown.find((category) => category.id === id)).find((category) => category !== undefined);

  return own ? chainTo(shown, own.slug) : [];
}
