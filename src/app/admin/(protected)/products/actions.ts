"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ProductFormState } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { validateProductInput } from "@/lib/products/validate";
import { uniqueSlug } from "@/lib/slug";

/** Postgres unique-violation, surfaced by Prisma as P2002. */
const UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(error: unknown): error is { code: string; meta?: { target?: string[] } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === UNIQUE_VIOLATION
  );
}

/**
 * Slugs already in use that could collide with `base`.
 *
 * Fetches the base and its numbered variants rather than the whole catalogue,
 * then lets uniqueSlug pick the next free number.
 */
async function takenSlugs(base: string, exceptId?: string): Promise<string[]> {
  const rows = await db.product.findMany({
    where: {
      slug: { startsWith: base },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { slug: true },
  });

  return rows.map((row) => row.slug);
}

export async function createProduct(
  _state: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const result = validateProductInput(formData);
  if (!result.ok) return { errors: result.errors };

  const slug = uniqueSlug(result.data.slug, await takenSlugs(result.data.slug));
  const { categoryIds, ...fields } = result.data;

  let id: string;
  try {
    const created = await db.product.create({
      data: {
        ...fields,
        slug,
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
    id = created.id;
  } catch (error) {
    if (isUniqueViolation(error) && error.meta?.target?.includes("sku")) {
      return { errors: { sku: "Another product already uses that code." } };
    }
    throw error;
  }

  revalidatePath("/admin/products");
  // redirect() signals by throwing, so it must sit outside the try/catch.
  redirect(`/admin/products/${id}`);
}

export async function updateProduct(
  id: string,
  _state: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const result = validateProductInput(formData);
  if (!result.ok) return { errors: result.errors };

  const slug = uniqueSlug(result.data.slug, await takenSlugs(result.data.slug, id));
  const { categoryIds, ...fields } = result.data;

  try {
    // Replace the category set in one transaction, so a failure part-way
    // cannot leave the product in half its intended categories.
    await db.$transaction([
      db.categoryProduct.deleteMany({ where: { productId: id } }),
      db.product.update({
        where: { id },
        data: {
          ...fields,
          slug,
          categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        },
      }),
    ]);
  } catch (error) {
    if (isUniqueViolation(error) && error.meta?.target?.includes("sku")) {
      return { errors: { sku: "Another product already uses that code." } };
    }
    throw error;
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);

  return { errors: {} };
}

/**
 * Archive rather than delete.
 *
 * Orders reference products, and a deleted row would leave past orders unable
 * to show what was bought. Archiving hides it everywhere a customer looks.
 */
export async function archiveProduct(id: string): Promise<void> {
  await requireAdmin();

  await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });

  revalidatePath("/admin/products");
  redirect("/admin/products");
}
