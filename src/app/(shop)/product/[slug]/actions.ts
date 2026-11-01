"use server";

import { revalidatePath } from "next/cache";

import type { ReviewState } from "@/components/shop/review-form";
import { currentCustomer } from "@/lib/account/dal";
import { db } from "@/lib/db";
import { EVERYONE, REVIEWS_IN_ALL, REVIEWS_PER_SHOPPER, attempt, emailKey } from "@/lib/rate-limit";
import { purchaseOf } from "@/lib/reviews/purchase";
import { parseReview } from "@/lib/reviews/validate";

function refresh(slug: string) {
  revalidatePath(`/product/${slug}`);
  revalidatePath("/admin/reviews");
  // The Overview counts what waits.
  revalidatePath("/admin");
}

/**
 * Keeps a shopper's review of a piece, to be read before it goes on the
 * shop - or, written again, their changed review, which waits to be read
 * again. One per account and piece; written signed in, so the account, not
 * the form, says whose it is.
 */
export async function writeReview(_state: ReviewState, formData: FormData): Promise<ReviewState> {
  const shopper = await currentCustomer();
  if (!shopper) return { errors: {}, notice: "Please sign in to write a review." };

  const parsed = parseReview(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const { productId, ...review } = parsed.data;

  // Only a piece on the shop has a page to review it on.
  const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true, slug: true } });
  if (!product) return { errors: {}, notice: "This piece is no longer on the shop, so it cannot be reviewed." };

  // Ten an hour from one account, and a ceiling for everyone together.
  // Only reviews kept count: one turned away is taken back off.
  const [fromShopper, inAll] = await Promise.all([attempt(REVIEWS_PER_SHOPPER, emailKey(shopper.email)), attempt(REVIEWS_IN_ALL, EVERYONE)]);
  if (fromShopper.over || inAll.over) {
    await Promise.all([fromShopper.forget(), inAll.forget()]);
    return fromShopper.over
      ? { errors: {}, notice: "You have written several reviews in the last hour. Please wait a little before writing another." }
      : { errors: {}, notice: "We can't take another review just now. Please try again a little later." };
  }

  // Looked for afresh each time it is written: bought since it was first
  // written, a changed review says so.
  const bought = await db.orderItem.findFirst({
    where: purchaseOf(shopper.id, product.id),
    orderBy: { order: { createdAt: "asc" } },
    select: { order: { select: { orderNumber: true } } },
  });
  const verifiedOrderNumber = bought?.order.orderNumber ?? null;

  // One moment for both, so the admin can tell a new review from one changed.
  const now = new Date();
  await db.review.upsert({
    where: { customerId_productId: { customerId: shopper.id, productId: product.id } },
    create: { customerId: shopper.id, productId: product.id, ...review, verifiedOrderNumber, createdAt: now, submittedAt: now },
    // New words wait to be read like any review; the shop's reply stays.
    update: { ...review, verifiedOrderNumber, status: "PENDING", hiddenReason: null, moderatedAt: null, submittedAt: now },
  });

  refresh(product.slug);
  return { errors: {}, sent: true };
}

/** A shopper's own review, gone for good - only ever their own. */
export async function deleteOwnReview(formData: FormData): Promise<void> {
  const shopper = await currentCustomer();
  if (!shopper) return;

  const id = formData.get("id");
  const where = { id: typeof id === "string" ? id : "", customerId: shopper.id };
  const review = await db.review.findFirst({ where, select: { id: true, product: { select: { slug: true } } } });
  if (!review) return;

  await db.review.deleteMany({ where });
  refresh(review.product.slug);
}
