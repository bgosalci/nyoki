"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { CategoryCostsState } from "@/components/admin/category-costs-form";
import type { CategoryFormState } from "@/components/admin/category-form";
import type { CategoryPostageState } from "@/components/admin/category-postage-form";
import { requireAdmin } from "@/lib/auth/dal";
import { CATEGORY_ORDER, moveAmongSiblings } from "@/lib/categories/ordering";
import { validateCategoryInput, wouldCreateCycle } from "@/lib/categories/validate";
import { parseCostLines } from "@/lib/costing/validate";
import { db } from "@/lib/db";
import { readPostage } from "@/lib/delivery/postage-input";
import type { Place } from "@/lib/products/ordering";
import { uniqueSlug } from "@/lib/slug";

async function takenSlugs(base: string, exceptId?: string): Promise<string[]> {
  const rows = await db.category.findMany({
    where: { slug: { startsWith: base }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

/**
 * The form hides a category's own subtree from the parent picker, but a
 * stale page or a hand-built request could still submit one. The database
 * would accept it and every tree walk would then loop, so it is refused here.
 */
async function parentError(id: string | null, parentId: string | null): Promise<string | null> {
  if (parentId === null) return null;

  const categories = await db.category.findMany({ select: { id: true, parentId: true } });

  if (!categories.some((category) => category.id === parentId)) {
    return "That parent category no longer exists.";
  }
  if (wouldCreateCycle(categories, id, parentId)) {
    return "A category cannot sit inside itself or one of its own sub-categories.";
  }
  return null;
}

/**
 * Keys from the categories' own sequence, lowest first: each above every key
 * already held, as a new category's is - so a category given them goes
 * last in whatever group it joins.
 */
async function freshPositions(count: number): Promise<number[]> {
  const rows = await db.$queryRaw<{ position: bigint }[]>`
    SELECT nextval(pg_get_serial_sequence('categories', 'position')) AS position FROM generate_series(1, ${count})
  `;
  return rows.map((row) => Number(row.position)).sort((a, b) => a - b);
}

export async function createCategory(
  _state: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const result = validateCategoryInput(formData);
  if (!result.ok) return { errors: result.errors };

  const problem = await parentError(null, result.data.parentId);
  if (problem) return { errors: { parentId: problem } };

  const slug = uniqueSlug(result.data.slug, await takenSlugs(result.data.slug));
  const category = await db.category.create({ data: { ...result.data, slug } });

  revalidatePath("/admin/categories");
  redirect(`/admin/categories/${category.id}`);
}

export async function updateCategory(
  id: string,
  _state: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();

  const result = validateCategoryInput(formData);
  if (!result.ok) return { errors: result.errors };

  const problem = await parentError(id, result.data.parentId);
  if (problem) return { errors: { parentId: problem } };

  // Moved into another group, it goes last there: a key from its old group
  // would put it wherever that number happens to fall among its new siblings.
  const current = await db.category.findUnique({ where: { id }, select: { parentId: true } });
  const regrouped = current !== null && current.parentId !== result.data.parentId;
  const position = regrouped ? (await freshPositions(1))[0] : undefined;

  const slug = uniqueSlug(result.data.slug, await takenSlugs(result.data.slug, id));
  await db.category.update({ where: { id }, data: { ...result.data, slug, ...(position === undefined ? {} : { position }) } });

  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${id}`);
  // The shop's header shows its name, in its colour.
  revalidatePath("/", "layout");
  return { errors: {} };
}

/**
 * Replace a category's usual costs, in one transaction so a failure cannot
 * leave half a list. Nothing already priced changes: pieces copy these in.
 */
export async function saveCategoryCosts(
  id: string,
  _state: CategoryCostsState,
  formData: FormData,
): Promise<CategoryCostsState> {
  await requireAdmin();

  const result = parseCostLines(formData);
  if (!result.ok) return { error: result.error };

  if (!(await db.category.findUnique({ where: { id }, select: { id: true } }))) {
    return { error: "That category no longer exists." };
  }

  await db.$transaction([
    db.categoryCostLine.deleteMany({ where: { categoryId: id } }),
    db.categoryCostLine.createMany({ data: result.lines.map((line, position) => ({ categoryId: id, position, ...line })) }),
  ]);

  revalidatePath(`/admin/categories/${id}`);
  return { saved: true };
}

/** A category's usual postage, read live by the pieces beneath it that have none of their own. */
export async function saveCategoryPostage(id: string, _state: CategoryPostageState, formData: FormData): Promise<CategoryPostageState> {
  await requireAdmin();

  const { facts, errors } = readPostage(formData, { grams: "usualGrams", size: "usualParcelSize", mm: "usualThicknessMm" });
  if (Object.keys(errors).length > 0) return { errors };

  const updated = await db.category.updateMany({
    where: { id },
    data: { usualGrams: facts.grams, usualParcelSize: facts.size, usualThicknessMm: facts.mm },
  });
  if (updated.count === 0) return { errors: { usualGrams: "That category no longer exists." } };

  revalidatePath(`/admin/categories/${id}`);
  return { errors: {}, saved: true };
}

/**
 * Saves a category dropped just before or after a sibling, which is the
 * shop's order too: the header's departments and their menus, the footer,
 * the home page and the tiles all follow it. Worked out afresh from the
 * database, so a stale list cannot write keys that no longer hold.
 */
export async function moveCategory(id: string, targetId: string, place: Place): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (place !== "before" && place !== "after") return { ok: false };

  const rows = await db.category.findMany({ orderBy: CATEGORY_ORDER, select: { id: true, parentId: true, position: true } });
  const updates = moveAmongSiblings(rows, id, targetId, place);
  if (updates === null) return { ok: false };

  if (updates.length > 0) {
    await db.$transaction(updates.map((row) => db.category.update({ where: { id: row.id }, data: { position: row.position } })));
  }

  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Deleting a category lifts its sub-categories to the top level and unlinks
 * its products; the products themselves are untouched. The sub-categories go
 * to the end of the top level, in their own order - left to the schema's
 * SetNull, they would keep keys that only meant something in the group they
 * left, and land among the departments wherever those numbers fell.
 */
export async function deleteCategory(id: string): Promise<void> {
  await requireAdmin();

  const inside = await db.category.findMany({ where: { parentId: id }, orderBy: CATEGORY_ORDER, select: { id: true } });
  const positions = inside.length > 0 ? await freshPositions(inside.length) : [];

  await db.$transaction([
    ...inside.map((child, index) => db.category.update({ where: { id: child.id }, data: { parentId: null, position: positions[index] } })),
    db.category.delete({ where: { id } }),
  ]);

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  redirect("/admin/categories");
}
