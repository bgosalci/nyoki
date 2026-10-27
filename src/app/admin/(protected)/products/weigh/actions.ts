"use server";

import { revalidatePath } from "next/cache";

import type { WeighState } from "@/components/admin/weigh-sheet";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { readWeighSheet } from "@/lib/delivery/postage-input";

/**
 * Saves the weighing sheet: every piece it posts is read and checked, and
 * only those whose postage changed are written, in one transaction. Any
 * wrong box saves nothing, and says which.
 */
export async function saveWeights(_state: WeighState, formData: FormData): Promise<WeighState> {
  await requireAdmin();

  const { rows, errors } = readWeighSheet(formData);
  if (Object.keys(errors).length > 0) return { errors };

  const current = new Map(
    (
      await db.product.findMany({
        where: { id: { in: rows.map((row) => row.id) } },
        select: { id: true, weightGrams: true, parcelSize: true, thicknessMm: true },
      })
    ).map((piece) => [piece.id, piece]),
  );
  const changed = rows.filter(({ id, facts }) => {
    const piece = current.get(id);
    return piece !== undefined && (piece.weightGrams !== facts.grams || piece.parcelSize !== facts.size || piece.thicknessMm !== facts.mm);
  });

  if (changed.length > 0) {
    await db.$transaction(
      changed.map(({ id, facts }) => db.product.update({ where: { id }, data: { weightGrams: facts.grams, parcelSize: facts.size, thicknessMm: facts.mm } })),
    );
  }

  revalidatePath("/admin/products/weigh");
  revalidatePath("/admin/products");
  revalidatePath("/admin/settings/delivery");
  return { errors: {}, saved: changed.length };
}
