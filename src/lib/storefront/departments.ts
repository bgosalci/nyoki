export interface NavCategory {
  id: string;
  slug: string;
  name: string;
  labelColour: string;
  parentId: string | null;
}

export interface Department {
  slug: string;
  name: string;
  labelColour: string;
  children: { slug: string; name: string; labelColour: string }[];
}

/**
 * The departments and the types in each that have a piece on the shop in
 * them, or anywhere beneath them - the header's row and menus, and the
 * footer's list. A name leading to an empty page is a dead end, as an empty
 * tile is (`categoryTiles` leaves those out too).
 *
 * `categories` arrives in `CATEGORY_ORDER`, and each group keeps that order.
 * `holding` is every category a piece on the shop is filed in directly; a
 * piece filed only in a type still fills the department above it. `take`
 * caps the types per department after the empty ones are gone, so the few
 * shown all lead somewhere.
 */
export function stockedDepartments(
  categories: readonly NavCategory[],
  holding: Iterable<string>,
  take?: number,
): Department[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const stocked = new Set<string>();

  for (const id of holding) {
    let category = byId.get(id);
    // Stops at one already counted, which is also what keeps a tree that
    // loops from hanging it.
    while (category && !stocked.has(category.id)) {
      stocked.add(category.id);
      category = category.parentId ? byId.get(category.parentId) : undefined;
    }
  }

  const shown = (category: NavCategory) => ({ slug: category.slug, name: category.name, labelColour: category.labelColour });

  return categories
    .filter((category) => category.parentId === null && stocked.has(category.id))
    .map((department) => ({
      ...shown(department),
      children: categories
        .filter((category) => category.parentId === department.id && stocked.has(category.id))
        .slice(0, take)
        .map(shown),
    }));
}
