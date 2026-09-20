"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { CategoryFormState } from "@/components/admin/category-form";
import { requireAdmin } from "@/lib/auth/dal";
import { validateCategoryInput, wouldCreateCycle } from "@/lib/categories/validate";
import { db } from "@/lib/db";
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

  const slug = uniqueSlug(result.data.slug, await takenSlugs(result.data.slug, id));
  await db.category.update({ where: { id }, data: { ...result.data, slug } });

  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${id}`);
  return { errors: {} };
}

/**
 * Deleting a category lifts its sub-categories to the top level (parentId is
 * SetNull in the schema) and unlinks its products; the products themselves are
 * untouched.
 */
export async function deleteCategory(id: string): Promise<void> {
  await requireAdmin();

  await db.category.delete({ where: { id } });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  redirect("/admin/categories");
}
