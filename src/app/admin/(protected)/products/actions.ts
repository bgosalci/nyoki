"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ProductFormState } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { validateProductInput, type ProductStatus } from "@/lib/products/validate";
import { isUniqueViolationOn } from "@/lib/db-errors";
import { uniqueSlug } from "@/lib/slug";
import { createImageStorage } from "@/lib/storage";

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
    if (isUniqueViolationOn(error, { table: "products", column: "sku" })) {
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
    if (isUniqueViolationOn(error, { table: "products", column: "sku" })) {
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

/** Applies a status to several products at once, from the list's bulk actions. */
export async function setProductsStatus(ids: string[], status: ProductStatus): Promise<void> {
  await requireAdmin();
  if (ids.length === 0) return;

  await db.product.updateMany({ where: { id: { in: ids } }, data: { status } });

  revalidatePath("/admin/products");
}

/**
 * Deletes products outright, with their photos.
 *
 * Safe for order history: a line snapshots the name, price and code it sold
 * at, and its product reference is nulled rather than cascading, so an old
 * order still reads correctly once the product is gone.
 */
export async function deleteProducts(ids: string[]): Promise<void> {
  await requireAdmin();
  if (ids.length === 0) return;

  const images = await db.productImage.findMany({
    where: { productId: { in: ids } },
    select: { url: true },
  });

  const storage = createImageStorage();
  for (const image of images) {
    try {
      await storage.remove(image.url);
    } catch {
      // A photo that cannot be removed - already gone, or stored by a backend
      // we no longer use - must not stop the product being deleted.
    }
  }

  await db.product.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/admin/products");
}
