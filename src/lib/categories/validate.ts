import { slugify } from "@/lib/slug";

export interface CategoryInput {
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
}

export type CategoryField = keyof CategoryInput;

export type CategoryErrors = Partial<Record<CategoryField, string>>;

export type CategoryValidation =
  | { ok: true; data: CategoryInput }
  | { ok: false; errors: CategoryErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function validateCategoryInput(form: FormData): CategoryValidation {
  const errors: CategoryErrors = {};

  const name = text(form, "name");
  const slug = slugify(text(form, "slug") || name);

  if (name.length === 0) {
    errors.name = "Give the category a name.";
  } else if (slug.length === 0) {
    errors.name = "That name has no letters or numbers to build a web address from.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const description = text(form, "description");
  const parentId = text(form, "parentId");

  return {
    ok: true,
    data: {
      name,
      slug,
      description: description.length > 0 ? description : null,
      parentId: parentId.length > 0 ? parentId : null,
    },
  };
}

export interface CategoryNode {
  id: string;
  parentId: string | null;
}

/**
 * Every category beneath `id`, however deep. Terminates on corrupt data that
 * already contains a cycle.
 */
export function descendantIds(categories: readonly CategoryNode[], id: string): Set<string> {
  const childrenOf = new Map<string | null, string[]>();
  for (const category of categories) {
    const siblings = childrenOf.get(category.parentId) ?? [];
    siblings.push(category.id);
    childrenOf.set(category.parentId, siblings);
  }

  const found = new Set<string>();
  const queue = [...(childrenOf.get(id) ?? [])];

  while (queue.length > 0) {
    const next = queue.pop()!;
    if (found.has(next)) continue;
    found.add(next);
    queue.push(...(childrenOf.get(next) ?? []));
  }

  return found;
}

/**
 * Whether giving `id` the parent `newParentId` would make it its own ancestor.
 *
 * A brand new category (`id` null) cannot be anyone's ancestor yet, and the
 * top level (`newParentId` null) cannot close a loop.
 */
export function wouldCreateCycle(
  categories: readonly CategoryNode[],
  id: string | null,
  newParentId: string | null,
): boolean {
  if (id === null || newParentId === null) return false;
  if (newParentId === id) return true;

  return descendantIds(categories, id).has(newParentId);
}
