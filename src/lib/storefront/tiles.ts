import { descendantIds } from "@/lib/categories/validate";

/**
 * The picture tiles a department or a group shows for what is inside it.
 *
 * Built in one pass over the active catalogue rather than a query per tile:
 * a group with thirty types beneath it would otherwise be thirty round trips
 * for a row of pictures.
 */

export interface TileCategory {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
}

export interface TileProduct {
  categoryIds: string[];
  image: { url: string; alt: string | null } | null;
}

export interface CategoryTile {
  slug: string;
  name: string;
  count: number;
  image: { url: string; alt: string | null } | null;
}

/**
 * A tile per child of `parentId`, covered by the photo of its first piece.
 *
 * `products` arrives in the order the storefront shows things - the order set
 * by dragging them in the admin - so the first one carrying a photo is the
 * face the category's own page leads with. A child
 * holding nothing is left out: a tile leading to an empty page is a dead end,
 * not information.
 */
export function categoryTiles(
  categories: readonly TileCategory[],
  parentId: string | null,
  products: readonly TileProduct[],
): CategoryTile[] {
  const tiles: CategoryTile[] = [];

  for (const child of categories.filter((category) => category.parentId === parentId)) {
    const within = new Set([child.id, ...descendantIds(categories, child.id)]);

    let count = 0;
    let image: CategoryTile["image"] = null;

    for (const product of products) {
      // A product can be linked to a group and to a type beneath it; it is
      // still one thing to buy.
      if (!product.categoryIds.some((id) => within.has(id))) continue;

      count += 1;
      if (image === null && product.image !== null) image = product.image;
    }

    if (count > 0) tiles.push({ slug: child.slug, name: child.name, count, image });
  }

  return tiles;
}

/**
 * The photo each of `categoryIds` would lead with: its first piece's, from
 * anywhere beneath it, exactly as its own tile above would show. A category
 * with no photo anywhere beneath it is left out.
 */
export function leadPhotos(
  categories: readonly TileCategory[],
  categoryIds: readonly string[],
  products: readonly TileProduct[],
): Map<string, NonNullable<TileProduct["image"]>> {
  const leads = new Map<string, NonNullable<TileProduct["image"]>>();

  for (const id of new Set(categoryIds)) {
    const within = new Set([id, ...descendantIds(categories, id)]);
    const first = products.find((product) => product.image !== null && product.categoryIds.some((at) => within.has(at)));
    if (first?.image) leads.set(id, first.image);
  }

  return leads;
}
