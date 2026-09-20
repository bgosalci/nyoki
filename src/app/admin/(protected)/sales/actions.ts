"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { SaleFormState } from "@/components/admin/sale-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { validateSaleInput } from "@/lib/sales/validate";

/** Every page whose prices a sale can change. */
function revalidateSales(id?: string) {
  revalidatePath("/admin/sales");
  revalidatePath("/admin/products");
  if (id) revalidatePath(`/admin/sales/${id}`);
}

export async function createSale(
  _state: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  await requireAdmin();

  const result = validateSaleInput(formData);
  if (!result.ok) return { errors: result.errors };

  const { productIds, ...fields } = result.data;

  const sale = await db.sale.create({
    data: {
      ...fields,
      products: { create: productIds.map((productId) => ({ productId })) },
    },
  });

  revalidateSales(sale.id);
  redirect(`/admin/sales/${sale.id}`);
}

export async function updateSale(
  id: string,
  _state: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  await requireAdmin();

  const result = validateSaleInput(formData);
  if (!result.ok) return { errors: result.errors };

  const { productIds, ...fields } = result.data;

  // Replace the product set in one transaction so a failure part-way cannot
  // leave the sale attached to half the intended products.
  await db.$transaction([
    db.saleProduct.deleteMany({ where: { saleId: id } }),
    db.sale.update({
      where: { id },
      data: {
        ...fields,
        products: { create: productIds.map((productId) => ({ productId })) },
      },
    }),
  ]);

  revalidateSales(id);
  return { errors: {} };
}

/**
 * Sales are deleted outright, unlike products: nothing snapshots a sale, and
 * an order records the price actually paid rather than which sale produced it.
 */
export async function deleteSale(id: string): Promise<void> {
  await requireAdmin();

  await db.sale.delete({ where: { id } });

  revalidateSales();
  redirect("/admin/sales");
}
