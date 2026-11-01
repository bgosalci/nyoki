"use server";

import { revalidatePath } from "next/cache";

import type { ReplyState } from "@/components/admin/review-list";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { parseHiddenReason } from "@/lib/reviews/moderation";
import { parseReply } from "@/lib/reviews/validate";

const idOf = (formData: FormData) => {
  const id = formData.get("id");
  return typeof id === "string" ? id : "";
};

/** The review and its piece's address, or null once it is deleted - in another tab, or by the shopper. */
function find(id: string) {
  return db.review.findUnique({ where: { id }, select: { id: true, product: { select: { slug: true } } } });
}

function refresh(slug: string) {
  revalidatePath(`/product/${slug}`);
  revalidatePath("/admin/reviews");
  // The Overview counts what waits.
  revalidatePath("/admin");
}

/** On the piece's page, from now. */
export async function publishReview(formData: FormData): Promise<void> {
  await requireAdmin();
  const review = await find(idOf(formData));
  if (!review) return;

  await db.review.update({ where: { id: review.id }, data: { status: "PUBLISHED", hiddenReason: null, moderatedAt: new Date() } });
  refresh(review.product.slug);
}

/**
 * Kept off the shop, or taken off it, for one of the reasons the reviews
 * policy names - never without one, since being unfavourable is not one.
 */
export async function hideReview(formData: FormData): Promise<void> {
  await requireAdmin();
  const reason = parseHiddenReason(formData.get("reason"));
  if (!reason) return;
  const review = await find(idOf(formData));
  if (!review) return;

  await db.review.update({ where: { id: review.id }, data: { status: "HIDDEN", hiddenReason: reason, moderatedAt: new Date() } });
  refresh(review.product.slug);
}

/** The shop's public reply beneath a review; emptied, it is taken away. */
export async function saveReply(_state: ReplyState, formData: FormData): Promise<ReplyState> {
  await requireAdmin();
  const parsed = parseReply(formData);
  if (!parsed.ok) return { error: parsed.error };
  const review = await find(parsed.data.id);
  if (!review) return { error: "This review has been deleted." };

  const { reply } = parsed.data;
  await db.review.update({ where: { id: review.id }, data: { reply, repliedAt: reply ? new Date() : null } });
  refresh(review.product.slug);
  return { saved: true };
}

/** Gone for good, with the reply: for a shopper who asks, or a review no one should keep. */
export async function deleteReview(formData: FormData): Promise<void> {
  await requireAdmin();
  const review = await find(idOf(formData));
  if (!review) return;

  await db.review.deleteMany({ where: { id: review.id } });
  refresh(review.product.slug);
}
