import { revalidatePath } from "next/cache";

import {
  categoryChangeNotice,
  planCategoryChange,
  type CategoryChangeResult,
  type CategoryChanges,
} from "@/lib/categories/assignment";
import { db } from "@/lib/db";

/**
 * Files pieces in categories and takes them out, for the actions that offer
 * it, which check the account themselves. One transaction, so a failure
 * leaves everything as it was. `skipDuplicates`, since the same link added
 * from another tab in the meantime is no reason to fail.
 *
 * Refused when none of the categories, or none of the pieces, exist any more:
 * nothing would change, and "nothing changed" would hide the reason.
 *
 * The shop is refreshed too: its menus and tiles list only categories with a
 * piece in them.
 */
export async function changeCategories(changes: CategoryChanges): Promise<CategoryChangeResult> {
  const categories = await db.category.findMany({ select: { id: true, slug: true, name: true, parentId: true } });
  const known = new Set(categories.map((category) => category.id));
  const asked = [...(changes.add?.categoryIds ?? []), ...(changes.remove?.categoryIds ?? [])];
  if (!asked.some((id) => known.has(id))) return { ok: false };

  const found = await db.product.findMany({
    where: { id: { in: [...new Set([...(changes.add?.productIds ?? []), ...(changes.remove?.productIds ?? [])])] } },
    select: {
      id: true,
      name: true,
      status: true,
      stock: true,
      colours: true,
      sizes: true,
      madeToOrder: true,
      madeOnOrder: true,
      variants: { select: { colour: true, size: true, stock: true } },
      customisation: { select: { message: true, personalisation: true } },
      packs: { select: { id: true }, take: 1 },
      categories: { select: { categoryId: true } },
    },
  });

  if (found.length === 0) return { ok: false };

  const plan = planCategoryChange(
    found.map(({ customisation, packs, categories: links, ...piece }) => ({
      ...piece,
      customised: Boolean(customisation?.message || customisation?.personalisation) || packs.length > 0,
      categoryIds: links.map((link) => link.categoryId),
    })),
    categories,
    changes,
  );

  const writes = [
    ...(plan.remove.length > 0 ? [db.categoryProduct.deleteMany({ where: { OR: plan.remove } })] : []),
    ...(plan.create.length > 0 ? [db.categoryProduct.createMany({ data: plan.create, skipDuplicates: true })] : []),
  ];
  if (writes.length > 0) {
    await db.$transaction(writes);
    revalidatePath("/admin/products");
    revalidatePath("/admin/categories");
    revalidatePath("/", "layout");
  }

  return { ok: true, said: categoryChangeNotice(plan, categories, changes) };
}
