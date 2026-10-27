"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { DeliveryRateFormState } from "@/components/admin/delivery-rate-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { validateDeliveryRate } from "@/lib/delivery/validate";

const LIST = "/admin/settings/delivery";

export async function createDeliveryRate(_state: DeliveryRateFormState, formData: FormData): Promise<DeliveryRateFormState> {
  await requireAdmin();

  const result = validateDeliveryRate(formData);
  if (!result.ok) return { errors: result.errors };

  await db.shippingRate.create({ data: result.data });

  revalidatePath(LIST);
  redirect(LIST);
}

export async function updateDeliveryRate(id: string, _state: DeliveryRateFormState, formData: FormData): Promise<DeliveryRateFormState> {
  await requireAdmin();

  const result = validateDeliveryRate(formData);
  if (!result.ok) return { errors: result.errors };

  await db.shippingRate.update({ where: { id }, data: result.data });

  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return { errors: {} };
}

/**
 * Deleted outright: an order copies the option's name and what it charged,
 * so nothing about an old order depends on the option surviving.
 */
export async function deleteDeliveryRate(id: string): Promise<void> {
  await requireAdmin();

  await db.shippingRate.delete({ where: { id } });

  revalidatePath(LIST);
  redirect(LIST);
}
