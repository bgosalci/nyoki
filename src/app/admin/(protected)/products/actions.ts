"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ProductFormState } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/auth/dal";
import { changeCategories } from "@/lib/categories/assign";
import type { CategoryChangeResult } from "@/lib/categories/assignment";
import { db } from "@/lib/db";
import { repriceProduct, validateRepriceInput, type RepriceFields } from "@/lib/products/repricing";
import { activationBlockedBecause } from "@/lib/products/activation";
import { parseAlsoLikeIds } from "@/lib/products/also-like";
import { moveUpdates, type Place } from "@/lib/products/ordering";
import { postedCategoryIds, validateProductInput, type ProductErrors, type ProductStatus } from "@/lib/products/validate";
import { isClothes } from "@/lib/clothes/group";
import { parseClothing, type ClothingInput } from "@/lib/clothes/settings";
import { planVariants, type StoredVariant } from "@/lib/clothes/variants";
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

/**
 * The "You may also like" pieces posted, in order, less any that no longer
 * exist - ids come from the browser, and a product deleted since the form was
 * opened would otherwise fail the whole save.
 */
async function alsoLikeFrom(formData: FormData, selfId: string | null) {
  const parsed = parseAlsoLikeIds(formData, selfId);
  if (!parsed.ok) return parsed;
  const known = new Set(
    (await db.product.findMany({ where: { id: { in: parsed.ids } }, select: { id: true } })).map((product) => product.id),
  );
  const ids = parsed.ids.filter((pieceId) => known.has(pieceId));
  return { ok: true as const, create: ids.map((pieceId, position) => ({ pieceId, position })) };
}

/**
 * The colours posted for any piece - and the sizes, for clothing - and the
 * stock of each, checked. A piece that is not clothing keeps whatever sizes
 * it has, offered to nobody, so a piece moved out of Clothes and back loses
 * nothing.
 */
async function clothingFrom(formData: FormData) {
  const categories = await db.category.findMany({ select: { id: true, slug: true, parentId: true } });
  return parseClothing(formData, isClothes(postedCategoryIds(formData), categories));
}

/**
 * What a save writes to the product and its variants. In colours or sizes,
 * its stock is the total of theirs; in neither, the Stock box's, and any
 * variants left go. A piece that is not clothing is planned against its
 * variants in no size alone, so the sized ones wait for it, untouched.
 */
function clothingWrites(clothing: ClothingInput, stored: readonly StoredVariant[]) {
  const total = clothing.combos.reduce((sum, combo) => sum + combo.stock, 0);
  return {
    fields: {
      colours: clothing.colours,
      ...(clothing.sizes !== null ? { sizes: clothing.sizes } : {}),
      ...(clothing.combos.length > 0 ? { stock: total } : {}),
    },
    plan: planVariants(clothing.sizes !== null ? stored : stored.filter((variant) => variant.size === null), clothing.combos),
  };
}

/** Every problem with the details and the colours and sizes together, so the form shows them all at once. */
function problems(details: ReturnType<typeof validateProductInput>, clothing: Awaited<ReturnType<typeof clothingFrom>>): ProductErrors {
  return { ...(details.ok ? {} : details.errors), ...(clothing.ok ? {} : clothing.errors) };
}

export async function createProduct(
  _state: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const result = validateProductInput(formData);
  const clothing = await clothingFrom(formData);
  if (!result.ok || !clothing.ok) return { errors: problems(result, clothing) };

  // A new product has no price until its Price tab gives it one, so it
  // cannot start out on the shop.
  const blocked = result.data.status === "ACTIVE" ? activationBlockedBecause({ pricePence: 0 }) : null;
  if (blocked) return { errors: { status: blocked } };

  const alsoLike = await alsoLikeFrom(formData, null);
  if (!alsoLike.ok) return { errors: { alsoLikeIds: alsoLike.error } };

  const slug = uniqueSlug(result.data.slug, await takenSlugs(result.data.slug));
  const { categoryIds, ...fields } = result.data;
  const writes = clothingWrites(clothing.data, []);

  let id: string;
  try {
    const created = await db.product.create({
      data: {
        ...fields,
        ...writes.fields,
        pricePence: 0,
        slug,
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        alsoLike: { create: alsoLike.create },
        variants: { create: writes.plan.create },
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
  const clothing = await clothingFrom(formData);
  if (!result.ok || !clothing.ok) return { errors: problems(result, clothing) };

  if (result.data.status === "ACTIVE") {
    const current = await db.product.findUnique({ where: { id }, select: { pricePence: true } });
    const blocked = current ? activationBlockedBecause(current) : null;
    if (blocked) return { errors: { status: blocked } };
  }

  const alsoLike = await alsoLikeFrom(formData, id);
  if (!alsoLike.ok) return { errors: { alsoLikeIds: alsoLike.error } };

  // The price is not among these fields, so saving the product form cannot
  // change it or reset it - only the Price tab can.
  const slug = uniqueSlug(result.data.slug, await takenSlugs(result.data.slug, id));
  const { categoryIds, ...fields } = result.data;
  const { fields: variantFields, plan } = clothingWrites(
    clothing.data,
    await db.productVariant.findMany({ where: { productId: id }, select: { id: true, colour: true, size: true } }),
  );

  try {
    // Replace the category set and the chosen pieces, and bring the variants
    // into step, in one transaction, so a failure part-way cannot leave the
    // product with half of any of them.
    await db.$transaction([
      db.categoryProduct.deleteMany({ where: { productId: id } }),
      db.alsoLike.deleteMany({ where: { productId: id } }),
      db.product.update({
        where: { id },
        data: {
          ...fields,
          ...variantFields,
          slug,
          categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
          alsoLike: { create: alsoLike.create },
        },
      }),
      ...(plan.remove.length > 0 ? [db.productVariant.deleteMany({ where: { id: { in: plan.remove } } })] : []),
      ...plan.update.map(({ id: variantId, ...data }) => db.productVariant.update({ where: { id: variantId }, data })),
      ...(plan.create.length > 0
        ? [db.productVariant.createMany({ data: plan.create.map((write) => ({ productId: id, ...write })) })]
        : []),
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

/** Files products in categories, from the list's bulk actions. They stay in any others they are in. */
export async function addProductsToCategories(productIds: string[], categoryIds: string[]): Promise<CategoryChangeResult> {
  await requireAdmin();
  return changeCategories({ add: { productIds, categoryIds } });
}

/** Takes products out of categories, from the list's bulk actions. They stay in any others, and on the shop. */
export async function removeProductsFromCategories(productIds: string[], categoryIds: string[]): Promise<CategoryChangeResult> {
  await requireAdmin();
  return changeCategories({ remove: { productIds, categoryIds } });
}

/**
 * Deletes products outright, with their photos.
 *
 * Safe for order history: a line snapshots the name, price and code it sold
 * at, and its product reference is nulled rather than cascading, so an old
 * order still reads correctly once the product is gone.
 */
/**
 * Move a piece just before or after another, as dropped on the products
 * list. The order is the shop's too, so both are refreshed.
 *
 * Worked out afresh from the database, not from the list as the browser saw
 * it, and kept within a status: the list groups drafts, active and archived
 * apart, so a drop across them is a mistake, not a request. One transaction,
 * so the keys it shuffles land together.
 */
export async function moveProduct(id: string, targetId: string, place: Place): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (place !== "before" && place !== "after") return { ok: false };

  const rows = await db.product.findMany({ select: { id: true, sortKey: true, status: true } });
  const moving = rows.find((row) => row.id === id);
  const target = rows.find((row) => row.id === targetId);
  if (!moving || !target || moving.status !== target.status) return { ok: false };

  const updates = moveUpdates(rows, id, targetId, place);
  if (updates.length > 0) {
    await db.$transaction(updates.map((row) => db.product.update({ where: { id: row.id }, data: { sortKey: row.sortKey } })));
  }

  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  return { ok: true };
}

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
