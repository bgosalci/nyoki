"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import type { UploadState } from "@/components/admin/product-images";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { moveImage, nextPosition, renumber } from "@/lib/images/order";
import { validateImageUpload } from "@/lib/images/validate";
import { createImageStorage } from "@/lib/storage";

/** Enough bytes to identify every format the validator knows. */
const SNIFF_BYTES = 16;

function editPath(productId: string): string {
  return `/admin/products/${productId}`;
}

export async function uploadProductImages(
  productId: string,
  _state: UploadState,
  formData: FormData,
): Promise<UploadState> {
  await requireAdmin();

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return { error: "Choose at least one photo to upload." };
  }

  const existing = await db.productImage.findMany({
    where: { productId },
    select: { position: true },
  });

  // Validate the whole batch before storing anything, so a bad file in the
  // middle does not leave half the photos uploaded and the rest not.
  const checked: { file: File; contentType: string; extension: string }[] = [];

  for (const [index, file] of files.entries()) {
    const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());

    const result = validateImageUpload({
      name: file.name,
      type: file.type,
      size: file.size,
      head,
      existingCount: existing.length + index,
    });

    if (!result.ok) return { error: result.error };

    checked.push({ file, contentType: result.contentType, extension: result.extension });
  }

  const storage = createImageStorage();
  let position = nextPosition(existing);

  for (const { file, contentType, extension } of checked) {
    const key = `products/${productId}/${randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { url } = await storage.put(key, bytes, contentType);

    await db.productImage.create({
      data: { productId, url, position },
    });

    position += 1;
  }

  revalidatePath(editPath(productId));

  return { error: null };
}

export async function removeProductImage(productId: string, imageId: string): Promise<void> {
  await requireAdmin();

  // Scoped to the product so a forged id cannot delete another product's photo.
  const image = await db.productImage.findFirst({
    where: { id: imageId, productId },
  });

  if (!image) return;

  await createImageStorage().remove(image.url);
  await db.productImage.delete({ where: { id: image.id } });

  const remaining = await db.productImage.findMany({
    where: { productId },
    select: { id: true, position: true },
  });

  await writePositions(renumber(remaining));

  revalidatePath(editPath(productId));
}

export async function moveProductImage(
  productId: string,
  imageId: string,
  direction: "up" | "down",
): Promise<void> {
  await requireAdmin();

  const images = await db.productImage.findMany({
    where: { productId },
    select: { id: true, position: true },
  });

  await writePositions(moveImage(images, imageId, direction));

  revalidatePath(editPath(productId));
}

/** Persist positions in one transaction so a failure part-way cannot leave two images sharing a slot. */
async function writePositions(images: readonly { id: string; position: number }[]): Promise<void> {
  await db.$transaction(
    images.map((image) =>
      db.productImage.update({
        where: { id: image.id },
        data: { position: image.position },
      }),
    ),
  );
}
