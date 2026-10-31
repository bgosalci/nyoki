"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import type { HomeState, UploadResult } from "@/components/admin/home-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { missingReferences, pageToRow, referencedIds, validateHomeInput } from "@/lib/home/content";
import { tileToRow } from "@/lib/home/tiles";
import { validateImageUpload } from "@/lib/images/validate";
import { createImageStorage } from "@/lib/storage";

/** Enough bytes to identify every format the validator knows. */
const SNIFF_BYTES = 16;

export async function saveHome(_state: HomeState, formData: FormData): Promise<HomeState> {
  await requireAdmin();

  const result = validateHomeInput(formData);
  if (!result.ok) return { errors: result.errors };

  // Everything chosen is looked up again: a category or photo can be deleted
  // while the editor is open, and an id posted is only a claim.
  const ids = referencedIds(result.data);
  const [categories, images, photos] = await Promise.all([
    db.category.findMany({ where: { id: { in: ids.categoryIds } }, select: { id: true } }),
    db.productImage.findMany({ where: { id: { in: ids.imageIds } }, select: { id: true } }),
    db.homePhoto.findMany({ where: { id: { in: ids.photoIds } }, select: { id: true } }),
  ]);

  const missing = missingReferences(result.data, {
    categoryIds: new Set(categories.map((row) => row.id)),
    imageIds: new Set(images.map((row) => row.id)),
    photoIds: new Set(photos.map((row) => row.id)),
  });
  if (missing) return { errors: missing };

  const page = pageToRow(result.data);

  // One row for the page, always - upsert, so the first save on a fresh shop
  // creates it - and the tiles replaced whole, in one transaction.
  await db.$transaction([
    db.homePage.upsert({ where: { id: "home" }, create: { id: "home", ...page }, update: page }),
    db.homeTile.deleteMany({}),
    db.homeTile.createMany({ data: result.data.tiles.map(tileToRow) }),
  ]);

  // Photos uploaded for tiles that no longer use them, the file first.
  const unused = await db.homePhoto.findMany({ where: { tiles: { none: {} } }, select: { id: true, url: true } });
  if (unused.length > 0) {
    const storage = createImageStorage();
    for (const photo of unused) await storage.remove(photo.url);
    await db.homePhoto.deleteMany({ where: { id: { in: unused.map((photo) => photo.id) } } });
  }

  revalidatePath("/");
  revalidatePath("/admin/home");

  return { errors: {}, saved: true };
}

/**
 * A photo uploaded for a tile, stored straight away so the editor can show
 * it. It belongs to no tile until the page is saved with it, and a save that
 * leaves it unused deletes it.
 */
export async function uploadHomePhoto(formData: FormData): Promise<UploadResult> {
  await requireAdmin();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a photo to upload." };

  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  const check = validateImageUpload({ name: file.name, type: file.type, size: file.size, head, existingCount: 0 });
  if (!check.ok) return { ok: false, error: check.error };

  const { url } = await createImageStorage().put(
    `home/${randomUUID()}.${check.extension}`,
    new Uint8Array(await file.arrayBuffer()),
    check.contentType,
  );
  const photo = await db.homePhoto.create({ data: { url }, select: { id: true, url: true } });

  return { ok: true, photo };
}
