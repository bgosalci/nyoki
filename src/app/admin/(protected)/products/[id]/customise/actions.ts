"use server";

import { revalidatePath } from "next/cache";

import type { CustomiseState } from "@/components/admin/customise-form";
import { requireAdmin } from "@/lib/auth/dal";
import { customisationGroup } from "@/lib/customisation/group";
import { parseCustomisation } from "@/lib/customisation/settings";
import { db } from "@/lib/db";

/**
 * Save how a card or bookmark can be made up.
 *
 * Checked on the server as a card or bookmark, since the tab's absence is no
 * guard against a forged post. One transaction: the settings, the things to
 * personalise and the packs land together or not at all. A section switched
 * off keeps what is stored for it - only its switch is written - so switching
 * it back on finds its cost and its fields where they were.
 */
export async function saveCustomisation(productId: string, _state: CustomiseState, formData: FormData): Promise<CustomiseState> {
  await requireAdmin();

  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id: productId }, select: { slug: true, categories: { select: { categoryId: true } } } }),
    db.category.findMany({ select: { id: true, slug: true, parentId: true } }),
  ]);
  if (!product) return { errors: { form: "This piece no longer exists." } };
  if (!customisationGroup(product.categories.map((link) => link.categoryId), categories)) {
    return { errors: { form: "Only cards and bookmarks can be customised. Put this piece in Cards or Bookmarks first." } };
  }

  const result = parseCustomisation(formData);
  if (!result.ok) return { errors: result.errors };

  const { message, personalisation, packs } = result.data;
  const settings = {
    message: message !== null,
    ...(message ? { messagePricePence: message.pricePence, messageMaxLength: message.maxLength } : {}),
    personalisation: personalisation !== null,
    ...(personalisation
      ? { personalisationPricePence: personalisation.pricePence, personalisationRequired: personalisation.required }
      : {}),
  };

  await db.$transaction([
    db.productCustomisation.upsert({ where: { productId }, create: { productId, ...settings }, update: settings }),
    ...(personalisation
      ? [
          db.personalisationField.deleteMany({ where: { productId } }),
          db.personalisationField.createMany({
            data: personalisation.fields.map((field, position) => ({ productId, position, ...field })),
          }),
        ]
      : []),
    db.productPack.deleteMany({ where: { productId } }),
    db.productPack.createMany({ data: packs.map((pack, position) => ({ productId, position, ...pack })) }),
  ]);

  revalidatePath(`/admin/products/${productId}`, "layout");
  revalidatePath(`/product/${product.slug}`);

  return { errors: {}, saved: true };
}
