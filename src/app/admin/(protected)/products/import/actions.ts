"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";

import type { ImportResult } from "@/components/admin/import-products";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { isUniqueViolationOn } from "@/lib/db-errors";
import { planImport, planSignature, toPreview, type ExistingProduct, type ImportPlan, type ImportPreview } from "@/lib/import/products";

/** A CSV is a few hundred KB for the whole catalogue; this is a guard, not a target. */
const MAX_CSV_CHARS = 5 * 1024 * 1024;

async function planFor(csv: string): Promise<ImportPlan> {
  const [products, categories] = await Promise.all([
    db.product.findMany({
      include: {
        categories: { select: { categoryId: true } },
        costLines: { orderBy: { position: "asc" } },
      },
    }),
    db.category.findMany({ select: { id: true, name: true } }),
  ]);

  const existing: ExistingProduct[] = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    status: product.status,
    pricePence: product.pricePence,
    compareAtPence: product.compareAtPence,
    vatRate: product.vatRate,
    stock: product.stock,
    madeToOrder: product.madeToOrder,
    description: product.description,
    materials: product.materials,
    dimensions: product.dimensions,
    careInstructions: product.careInstructions,
    weightGrams: product.weightGrams,
    featured: product.featured,
    oneOfAKind: product.oneOfAKind,
    leadTimeDays: product.leadTimeDays,
    categoryIds: product.categories.map((link) => link.categoryId),
    lines: product.costLines.map(({ label, unitPence, quantityHundredths }) => ({ label, unitPence, quantityHundredths })),
  }));

  return planImport(csv, existing, categories);
}

const hash = (plan: ImportPlan) => createHash("sha256").update(planSignature(plan)).digest("hex");

/** Works out what the file would do. Writes nothing. */
export async function checkImport(csv: string): Promise<ImportPreview> {
  await requireAdmin();
  if (csv.length > MAX_CSV_CHARS) return toPreview({ ...(await planFor("")), error: "The file is over 5MB. Import it in parts." }, "");

  const plan = await planFor(csv);
  return toPreview(plan, hash(plan));
}

/**
 * Imports the file - if the plan, worked out afresh, is still the one that
 * was seen. Nothing records what a product was before, so a preview that no
 * longer holds (someone saved a product in between) is refused rather than
 * applied over the top of their change.
 *
 * One transaction: a failure part-way leaves the catalogue as it was.
 */
export async function applyImport(csv: string, signature: string): Promise<ImportResult> {
  await requireAdmin();
  const refused = (error: string): ImportResult => ({ error, added: 0, changed: 0 });

  if (csv.length > MAX_CSV_CHARS) return refused("The file is over 5MB. Import it in parts.");
  const plan = await planFor(csv);
  if (plan.error) return refused(plan.error);
  if (hash(plan) !== signature) return refused("The products have changed since the file was checked. Choose it again to see what it would do now.");
  if (plan.counts.withProblems > 0) return refused("The file still has rows that need fixing. Nothing has been imported.");

  const added = plan.rows.filter((row) => row.kind === "new");
  const changed = plan.rows.filter((row) => row.kind === "update");

  const fields = ({ categoryIds: _categories, lines: _lines, ...scalars }: (typeof plan.rows)[number]["values"]) => scalars;

  try {
    await db.$transaction([
      ...added.map((row) =>
        db.product.create({
          data: {
            ...fields(row.values),
            categories: { create: row.values.categoryIds.map((categoryId) => ({ categoryId })) },
            costLines: { create: row.values.lines.map((line, position) => ({ ...line, position })) },
          },
        }),
      ),
      ...changed.flatMap((row) => {
        const productId = row.productId!;
        return [
          db.product.update({ where: { id: productId }, data: fields(row.values) }),
          db.categoryProduct.deleteMany({ where: { productId } }),
          db.categoryProduct.createMany({ data: row.values.categoryIds.map((categoryId) => ({ categoryId, productId })) }),
          db.costLine.deleteMany({ where: { productId } }),
          db.costLine.createMany({ data: row.values.lines.map((line, position) => ({ ...line, productId, position })) }),
        ];
      }),
    ]);
  } catch (error) {
    if (isUniqueViolationOn(error, { table: "products", column: "sku" }) || isUniqueViolationOn(error, { table: "products", column: "slug" })) {
      return refused("Another change took a web address or product code the file uses. Choose the file again.");
    }
    throw error;
  }

  revalidatePath("/admin/products", "layout");
  revalidatePath("/", "layout");
  return { error: null, added: added.length, changed: changed.length };
}
