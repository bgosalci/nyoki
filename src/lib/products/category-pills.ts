import { descendantIds } from "@/lib/categories/validate";

export interface PillCategory {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
}

export interface PillRow {
  /** The category whose children this row lists; null for the top level. */
  parent: PillCategory | null;
  items: PillCategory[];
  activeSlug: string | null;
}

/** From the top-level group down to the selected category; empty if nothing usable is selected. */
export function chainTo(categories: readonly PillCategory[], slug: string | null): PillCategory[] {
  if (!slug) return [];
  const byId = new Map(categories.map((c) => [c.id, c]));
  let current = categories.find((c) => c.slug === slug) ?? null;
  const chain: PillCategory[] = [];
  const seen = new Set<string>();

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? (byId.get(current.parentId) ?? null) : null;
  }

  return chain;
}

/**
 * One row of pills per level: the groups, then the chosen group's types, and
 * so on down to the selection. Siblings stay visible so the choice can be
 * changed without going back up.
 */
export function pillRows(categories: readonly PillCategory[], selectedSlug: string | null): PillRow[] {
  const chain = chainTo(categories, selectedSlug);
  const childrenOf = (parentId: string | null) => categories.filter((c) => c.parentId === parentId);

  const rows: PillRow[] = [{ parent: null, items: childrenOf(null), activeSlug: chain[0]?.slug ?? null }];

  chain.forEach((category, depth) => {
    const items = childrenOf(category.id);
    if (items.length === 0) return;
    rows.push({ parent: category, items, activeSlug: chain[depth + 1]?.slug ?? null });
  });

  return rows;
}

/** The category and everything beneath it, for matching products linked to any of them. */
export function subtreeIds(categories: readonly PillCategory[], id: string): string[] {
  return [id, ...descendantIds(categories, id)];
}
