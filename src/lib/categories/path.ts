import { matchesEveryWord } from "@/lib/search";

export interface PathCategory {
  id: string;
  name: string;
  parentId: string | null;
}

/**
 * Each category's place in the tree, group first: "Cards › Christmas Cards".
 * A name alone is not always enough - several groups have a "Cardigan" - and
 * the path is also what a search matches, so a group's name finds its types.
 */
export function categoryPaths(categories: readonly PathCategory[]): Map<string, string> {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const paths = new Map<string, string>();

  for (const category of categories) {
    const names: string[] = [];
    const seen = new Set<string>();
    for (let at: PathCategory | undefined = category; at && !seen.has(at.id); at = at.parentId ? byId.get(at.parentId) : undefined) {
      seen.add(at.id);
      names.unshift(at.name);
    }
    paths.set(category.id, names.join(" › "));
  }
  return paths;
}

/** A product's categories by their places in the tree, in order; any since deleted are skipped. */
export function pathsOf(categoryIds: readonly string[], paths: ReadonlyMap<string, string>): string[] {
  return categoryIds
    .map((id) => paths.get(id))
    .filter((path): path is string => path !== undefined)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Which categories a search shows: those whose place in the tree has every
 * word typed - so "cards" finds a group's types - and, so a match is not left
 * without its group, whatever each sits inside.
 */
export function categoriesMatching(categories: readonly PathCategory[], query: string, paths: ReadonlyMap<string, string>): Set<string> {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const matching = categories.filter((category) => matchesEveryWord(paths.get(category.id) ?? "", query));
  const shown = new Set(matching.map((category) => category.id));
  for (const category of matching) {
    for (let parent = category.parentId; parent && !shown.has(parent); parent = byId.get(parent)?.parentId ?? null) shown.add(parent);
  }
  return shown;
}
