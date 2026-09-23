import type { EntryLine } from "@/lib/costing/import";

/**
 * A category's usual costs: the lines most pieces in it share - card and
 * envelope, bag, ink, postage - to start a piece's costing from.
 *
 * They are copied into a piece, to be checked and saved, never linked:
 * changing a category's usual costs changes nothing already priced.
 */
export interface TemplateCategory {
  id: string;
  name: string;
  parentId: string | null;
  lines: EntryLine[];
}

export interface CostTemplate {
  categoryId: string;
  categoryName: string;
  lines: EntryLine[];
}

/**
 * The usual costs to offer a piece, from the categories it is in.
 *
 * Each category looks to itself first, then up the tree, and the nearest with
 * usual costs answers - so Easter Card can have its own, while Christmas
 * Cards falls back to Cards'. A piece in several places is offered each set
 * once.
 */
export function templatesFor(productCategoryIds: readonly string[], categories: readonly TemplateCategory[]): CostTemplate[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const offered = new Map<string, CostTemplate>();

  for (const id of productCategoryIds) {
    const seen = new Set<string>();
    let category = byId.get(id);

    while (category && !seen.has(category.id)) {
      if (category.lines.length > 0) {
        if (!offered.has(category.id)) {
          offered.set(category.id, { categoryId: category.id, categoryName: category.name, lines: category.lines });
        }
        break;
      }
      seen.add(category.id);
      category = category.parentId ? byId.get(category.parentId) : undefined;
    }
  }

  return [...offered.values()];
}
