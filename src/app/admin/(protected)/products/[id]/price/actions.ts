"use server";

import { revalidatePath } from "next/cache";

import type { PricingState } from "@/components/admin/pricing-editor";
import { requireAdmin } from "@/lib/auth/dal";
import { validatePricingInput } from "@/lib/costing/validate";
import { db } from "@/lib/db";

/**
 * Save a piece's costs, price and VAT together.
 *
 * One transaction, so a failure cannot leave new costs beside an old price.
 * The price-list row the costs were filled from, if any, is recorded against
 * the piece - but only a row nobody else has claimed, since its id arrives
 * from the browser.
 */
export async function savePricing(productId: string, _state: PricingState, formData: FormData): Promise<PricingState> {
  await requireAdmin();

  const result = validatePricingInput(formData);
  if (!result.ok) return { errors: result.errors };

  const { pricePence, compareAtPence, vatRate, lines } = result.data;

  const fromEntry = formData.get("fromEntry");
  const entry =
    typeof fromEntry === "string" && fromEntry.length > 0
      ? await db.priceListEntry.findFirst({
          where: { id: fromEntry, OR: [{ productId: null }, { productId }] },
          select: { id: true },
        })
      : null;

  await db.$transaction([
    db.costLine.deleteMany({ where: { productId } }),
    db.costLine.createMany({ data: lines.map((line, position) => ({ productId, position, ...line })) }),
    db.product.update({ where: { id: productId }, data: { pricePence, compareAtPence, vatRate } }),
    // One row per piece: a piece that had another row lets it go first.
    ...(entry
      ? [
          db.priceListEntry.updateMany({ where: { productId, NOT: { id: entry.id } }, data: { productId: null } }),
          db.priceListEntry.update({ where: { id: entry.id }, data: { productId } }),
        ]
      : []),
  ]);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`, "layout");

  return { errors: {}, saved: true };
}
