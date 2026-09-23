"use server";

import { revalidatePath } from "next/cache";

import type { HomeState } from "@/components/admin/home-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { validateHomeInput } from "@/lib/home/content";

export async function saveHome(_state: HomeState, formData: FormData): Promise<HomeState> {
  await requireAdmin();

  const result = validateHomeInput(formData);
  if (!result.ok) return { errors: result.errors };

  // One row, always. Upsert rather than update so the first save on a fresh
  // shop creates it instead of failing.
  await db.homePage.upsert({
    where: { id: "home" },
    create: { id: "home", ...result.data },
    update: result.data,
  });

  revalidatePath("/");

  return { errors: {}, saved: true };
}
