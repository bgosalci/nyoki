"use client";

import { useCallback, useId, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/shop/confirm-dialog";
import { PlainText } from "@/components/shop/plain-text";
import { ReviewForm, type ReviewAction } from "@/components/shop/review-form";
import { ShopReply, VerifiedBadge } from "@/components/shop/reviews";
import { Stars } from "@/components/stars";
import { ui } from "@/lib/brand/ui";
import { shopperStatus, type HiddenReason, type ReviewStatus } from "@/lib/reviews/moderation";

/** The signed-in shopper's own review of the piece, whatever has become of it. */
export interface OwnReview {
  id: string;
  rating: number;
  body: string;
  name: string;
  status: ReviewStatus;
  hiddenReason: HiddenReason | null;
  verified: boolean;
  reply: string | null;
}

/**
 * A shopper's own review on the piece's page: where it stands - waiting to
 * be read, on the shop, or not published and why - and the way to change it
 * or delete it. Deleting asks first, since it cannot be undone.
 */
export function YourReview({
  review,
  productId,
  write,
  remove,
}: {
  review: OwnReview;
  productId: string;
  write: ReviewAction;
  remove: (formData: FormData) => Promise<void>;
}) {
  const headingId = useId();
  const deleteForm = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Kept the same between renders: the form calls it once the change is kept.
  const done = useCallback(() => setEditing(false), []);

  return (
    <section aria-labelledby={headingId} className={`rounded-lg border p-5 ${ui.shopRule} ${ui.shopSurface}`}>
      <h3 id={headingId} className={`text-base font-medium ${ui.shopHeading}`}>
        Your review
      </h3>
      {/* Said aloud when it changes: a review sent, or changed, waits to be read. */}
      <p role="status" className={`mt-1 text-sm leading-relaxed ${ui.shopMuted}`}>
        {shopperStatus(review)}
      </p>

      {editing ? (
        <div className="mt-4">
          <ReviewForm
            action={write}
            productId={productId}
            defaults={{ rating: review.rating, body: review.body, name: review.name }}
            editing
            onSent={done}
            onCancel={done}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Stars tenths={review.rating * 10} />
            {review.verified ? <VerifiedBadge /> : null}
          </div>
          <p className="mt-2 text-sm font-medium">{review.name}</p>
          <PlainText text={review.body} className="mt-2 text-sm leading-relaxed" />
          {review.reply ? <ShopReply id={review.id} text={review.reply} /> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`px-5 py-2.5 text-xs tracking-[0.14em] uppercase ${ui.shopButtonOutline}`}
            >
              Change your review
            </button>
            <form ref={deleteForm} action={remove}>
              <input type="hidden" name="id" value={review.id} />
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className={`px-5 py-2.5 text-xs tracking-[0.14em] uppercase ${ui.shopButtonOutline}`}
              >
                Delete your review
              </button>
            </form>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="Delete your review?"
        description="It comes off the shop and is gone for good. You can write another whenever you like."
        confirmLabel="Delete review"
        cancelLabel="Keep it"
        onConfirm={() => {
          setConfirming(false);
          deleteForm.current?.requestSubmit();
        }}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}
