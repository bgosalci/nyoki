"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { DiscountCodeFormState } from "@/components/admin/discount-code-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { isUniqueViolationOn } from "@/lib/db-errors";
import { validateDiscountCodeInput } from "@/lib/discounts/validate";

const TAKEN = "Another code already uses that. Pick a different one.";

export async function createDiscountCode(
  _state: DiscountCodeFormState,
  formData: FormData,
): Promise<DiscountCodeFormState> {
  await requireAdmin();

  const result = validateDiscountCodeInput(formData);
  if (!result.ok) return { errors: result.errors };

  let id: string;
  try {
    const created = await db.discountCode.create({ data: result.data });
    id = created.id;
  } catch (error) {
    if (isUniqueViolationOn(error, { table: "discount_codes", column: "code" })) {
      return { errors: { code: TAKEN } };
    }
    throw error;
  }

  revalidatePath("/admin/codes");
  redirect(`/admin/codes/${id}`);
}

export async function updateDiscountCode(
  id: string,
  _state: DiscountCodeFormState,
  formData: FormData,
): Promise<DiscountCodeFormState> {
  await requireAdmin();

  const result = validateDiscountCodeInput(formData);
  if (!result.ok) return { errors: result.errors };

  try {
    await db.discountCode.update({ where: { id }, data: result.data });
  } catch (error) {
    if (isUniqueViolationOn(error, { table: "discount_codes", column: "code" })) {
      return { errors: { code: TAKEN } };
    }
    throw error;
  }

  revalidatePath("/admin/codes");
  revalidatePath(`/admin/codes/${id}`);
  return { errors: {} };
}

/**
 * Codes are deleted outright. Orders record the discount they were given in
 * pence, so nothing about an old order depends on the code still existing.
 */
export async function deleteDiscountCode(id: string): Promise<void> {
  await requireAdmin();

  await db.discountCode.delete({ where: { id } });

  revalidatePath("/admin/codes");
  redirect("/admin/codes");
}
