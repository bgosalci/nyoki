"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ProductFormState } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { repriceProduct, validateRepriceInput, type RepriceFields } from "@/lib/products/repricing";
import { activationBlockedBecause } from "@/lib/products/activation";
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

  // A new product has no price until the pricing page gives it one, so it
  // cannot start out on the shop.
  const blocked = result.data.status === "ACTIVE" ? activationBlockedBecause({ pricePence: 0 }) : null;
  if (blocked) return { errors: { status: blocked } };

  const slug = uniqueSlug(result.data.slug, await takenSlugs(result.data.slug));
  const { categoryIds, ...fields } = result.data;

  let id: string;
  try {
    const created = await db.product.create({
      data: {
        ...fields,
        pricePence: 0,
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

  if (result.data.status === "ACTIVE") {
    const current = await db.product.findUnique({ where: { id }, select: { pricePence: true } });
    const blocked = current ? activationBlockedBecause(current) : null;
    if (blocked) return { errors: { status: blocked } };
  }

  // The price is not among these fields, so saving the product form cannot
  // change it or reset it - only the pricing page can.
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

/**
 * Applies a status to several products at once, from the list's bulk actions.
 *
 * Making products active skips any not yet priced, and says which, rather
 * than putting them on the shop for free or quietly doing nothing.
 */
export async function setProductsStatus(ids: string[], status: ProductStatus): Promise<{ unpriced: string[] }> {
  await requireAdmin();
  if (ids.length === 0) return { unpriced: [] };

  const unpriced =
    status === "ACTIVE"
      ? await db.product.findMany({ where: { id: { in: ids }, pricePence: { lte: 0 } }, select: { name: true } })
      : [];

  await db.product.updateMany({
    where: { id: { in: ids }, ...(status === "ACTIVE" ? { pricePence: { gt: 0 } } : {}) },
    data: { status },
  });

  revalidatePath("/admin/products");

  return { unpriced: unpriced.map((product) => product.name) };
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

/**
 * Changes the price of several products at once.
 *
 * The browser sends the figures that were typed, never the prices it worked
 * out: those are a preview. Each new price is calculated here from the row in
 * the database, so a stale list cannot reprice against prices that have since
 * moved.
 *
 * There is no undo - nothing records what a price used to be - which is why
 * the dialog shows every change before it is applied.
 */
export async function repriceProducts(ids: string[], fields: RepriceFields): Promise<void> {
  await requireAdmin();
  if (ids.length === 0) return;

  const result = validateRepriceInput(fields);
  if (!result.ok) {
    // The dialog runs the same validation, so getting here means the request
    // did not come from it. Fail loudly rather than quietly repricing nothing.
    throw new Error("Invalid price change.");
  }

  const products = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, pricePence: true, compareAtPence: true },
  });

  const updates = products
    .map((product) => ({ id: product.id, ...repriceProduct(product, result.data) }))
    .filter((update) => update.changed);

  if (updates.length === 0) return;

  // One transaction, so a failure part-way cannot leave half the selection
  // repriced and the other half not.
  await db.$transaction(
    updates.map(({ id, pricePence, compareAtPence }) =>
      db.product.update({ where: { id }, data: { pricePence, compareAtPence } }),
    ),
  );

  revalidatePath("/admin/products");
  for (const { id } of updates) revalidatePath(`/admin/products/${id}`);
}
