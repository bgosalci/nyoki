"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { DeliveryRateFormState } from "@/components/admin/delivery-rate-form";
import type { DeliverySettingsFormState } from "@/components/admin/delivery-settings-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { DELIVERY_SETTINGS_ID, settingsRow } from "@/lib/delivery/store";
import { validateDeliveryRate, validateDeliverySettings } from "@/lib/delivery/validate";

const LIST = "/admin/settings/delivery";

export async function createDeliveryRate(_state: DeliveryRateFormState, formData: FormData): Promise<DeliveryRateFormState> {
  await requireAdmin();

  const result = validateDeliveryRate(formData);
  if (!result.ok) return { errors: result.errors };

  const { bands, ...rate } = result.data;
  await db.shippingRate.create({ data: { ...rate, bands: bands ? { create: bands } : undefined } });

  revalidatePath(LIST);
  redirect(LIST);
}

/** Saves an option. Its price list is replaced only when it is priced by it; at one price, the list is kept as it was. */
export async function updateDeliveryRate(id: string, _state: DeliveryRateFormState, formData: FormData): Promise<DeliveryRateFormState> {
  await requireAdmin();

  const result = validateDeliveryRate(formData);
  if (!result.ok) return { errors: result.errors };

  const { bands, ...rate } = result.data;
  await db.$transaction([
    db.shippingRate.update({ where: { id }, data: rate }),
    ...(bands ? [db.shippingBand.deleteMany({ where: { rateId: id } }), db.shippingBand.createMany({ data: bands.map((band) => ({ ...band, rateId: id })) })] : []),
  ]);

  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return { errors: {} };
}

/**
 * Deleted outright: an order copies the option's name, what it charged and
 * the parcel, so nothing about an old order depends on the option surviving.
 */
export async function deleteDeliveryRate(id: string): Promise<void> {
  await requireAdmin();

  await db.shippingRate.delete({ where: { id } });

  revalidatePath(LIST);
  redirect(LIST);
}

/** The packing for each size, and what a piece not weighed counts as. */
export async function saveDeliverySettings(_state: DeliverySettingsFormState, formData: FormData): Promise<DeliverySettingsFormState> {
  await requireAdmin();

  const result = validateDeliverySettings(formData);
  if (!result.ok) return { errors: result.errors, saved: false };

  const row = settingsRow(result.data);
  await db.deliverySettings.upsert({ where: { id: DELIVERY_SETTINGS_ID }, create: { id: DELIVERY_SETTINGS_ID, ...row }, update: row });

  revalidatePath(LIST);
  return { errors: {}, saved: true };
}

/** Records that the price lists were checked against Royal Mail's own today. */
export async function markPricesChecked(): Promise<void> {
  await requireAdmin();

  const now = new Date();
  await db.deliverySettings.upsert({ where: { id: DELIVERY_SETTINGS_ID }, create: { id: DELIVERY_SETTINGS_ID, pricesCheckedOn: now }, update: { pricesCheckedOn: now } });

  revalidatePath(LIST);
}
