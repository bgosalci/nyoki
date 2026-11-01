"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { inputClass } from "@/components/admin/field";
import { Stars } from "@/components/stars";
import { ui } from "@/lib/brand/ui";
import { useActionForm } from "@/lib/forms/action-form";
import { formatDateTime } from "@/lib/orders/status";
import { HIDDEN_REASONS, hiddenReasonLabel, type HiddenReason, type ReviewStatus } from "@/lib/reviews/moderation";
import { REPLY_MAX } from "@/lib/reviews/validate";

export interface ModerationRow {
  id: string;
  rating: number;
  body: string;
  /** The name shown with it, which the shopper chose. */
  name: string;
  /** The account it was written from. */
  email: string;
  productId: string;
  productName: string;
  /** The order that showed the account bought the piece; null when none did. */
  verifiedOrderNumber: string | null;
  status: ReviewStatus;
  hiddenReason: HiddenReason | null;
  reply: string | null;
  submittedAt: Date;
  moderatedAt: Date | null;
}

export interface ReplyState {
  saved?: true;
  error?: string;
}

type FormAction = (formData: FormData) => Promise<void>;
type ReplyAction = (state: ReplyState, formData: FormData) => Promise<ReplyState>;

interface Actions {
  publish: FormAction;
  hide: FormAction;
  saveReply: ReplyAction;
  remove: FormAction;
}

/**
 * Shoppers' reviews to read, publish or keep off the shop, and reply to.
 *
 * Each says what it is - its stars, the name shown and the account behind
 * it, the piece, the words, and whether the account bought the piece here -
 * and what can be done with it. A review is kept off, or taken off, only for
 * a reason the reviews policy names, chosen from the list. Deleting asks
 * first, since it cannot be undone.
 */
export function ReviewModerationList({ reviews, ...actions }: { reviews: ModerationRow[] } & Actions) {
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review) => (
        <li key={review.id}>
          <ReviewCard review={review} {...actions} />
        </li>
      ))}
    </ul>
  );
}

function ReviewCard({ review, publish, hide, saveReply, remove }: { review: ModerationRow } & Actions) {
  const nameId = useId();
  const reasonId = useId();
  const reasonHint = useId();
  const deleteForm = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <article aria-labelledby={nameId} className={`rounded-lg border p-5 ${ui.card} ${ui.rule}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Stars tenths={review.rating * 10} />
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span id={nameId} className="font-medium">
              {review.name}
            </span>
            <span className={`text-sm ${ui.mutedOnPanel}`}>{review.email}</span>
          </p>
        </div>
        <p className={`text-sm ${ui.mutedOnPanel}`}>
          Sent <time dateTime={review.submittedAt.toISOString()}>{formatDateTime(review.submittedAt)}</time>
          {review.moderatedAt && review.status !== "PENDING" ? (
            <>
              {" · "}
              {review.status === "PUBLISHED" ? "Published" : "Kept off"}{" "}
              <time dateTime={review.moderatedAt.toISOString()}>{formatDateTime(review.moderatedAt)}</time>
            </>
          ) : null}
        </p>
      </div>

      <p className={`mt-1 text-sm ${ui.mutedOnPanel}`}>
        Of{" "}
        <Link href={`/admin/products/${review.productId}`} className={ui.link}>
          {review.productName}
        </Link>
        {" · "}
        {review.verifiedOrderNumber ? (
          <>
            Verified purchase,{" "}
            <Link href={`/admin/orders/${review.verifiedOrderNumber}`} className={ui.link}>
              {review.verifiedOrderNumber}
            </Link>
          </>
        ) : (
          "Not bought from the shop by this account"
        )}
      </p>

      {review.status === "HIDDEN" ? (
        <p className={`mt-3 inline-block rounded px-2 py-1 text-xs font-medium ${ui.badgeQuiet}`}>
          Not published{review.hiddenReason ? `: ${hiddenReasonLabel(review.hiddenReason)}` : ""}
        </p>
      ) : null}

      <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{review.body}</p>

      <ReplyForm review={review} save={saveReply} />

      <div className="mt-4 flex flex-wrap items-end gap-2">
        {review.status !== "PUBLISHED" ? (
          <form action={publish}>
            <input type="hidden" name="id" value={review.id} />
            <button type="submit" className={`rounded-md px-3 py-1.5 text-sm font-medium ${ui.buttonPrimary}`}>
              Publish
            </button>
          </form>
        ) : null}

        {review.status !== "HIDDEN" ? (
          <form action={hide} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={review.id} />
            <div className="flex flex-col gap-1">
              <label htmlFor={reasonId} className={`text-xs ${ui.mutedOnPanel}`}>
                Reason
              </label>
              <select id={reasonId} name="reason" required defaultValue="" aria-describedby={reasonHint} className={`${inputClass} py-1.5`}>
                <option value="" disabled>
                  Choose a reason
                </option>
                {HIDDEN_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}>
              {review.status === "PUBLISHED" ? "Take off the shop" : "Don't publish"}
            </button>
          </form>
        ) : null}

        <form ref={deleteForm} action={remove} className="ml-auto">
          <input type="hidden" name="id" value={review.id} />
          <button type="button" onClick={() => setConfirming(true)} className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}>
            Delete
          </button>
        </form>
      </div>

      {review.status !== "HIDDEN" ? (
        // At the moment of choosing: the law forbids leaving out the bad ones.
        <p id={reasonHint} className={`mt-2 text-xs ${ui.mutedOnPanel}`}>
          A reason only from the list, as the reviews policy says - never for being unfavourable.
        </p>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title="Delete this review?"
        description={`${review.name}'s review of ${review.productName}, and any reply, go for good. To keep it off the shop but on record, choose a reason instead.`}
        confirmLabel="Delete review"
        onConfirm={() => {
          setConfirming(false);
          deleteForm.current?.requestSubmit();
        }}
        onCancel={() => setConfirming(false)}
      />
    </article>
  );
}

/** The shop's reply, shown beneath the review on the shop once it is published. */
function ReplyForm({ review, save }: { review: ModerationRow; save: ReplyAction }) {
  // What was typed survives a reply turned down: React resets the form either way.
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(save, {}, (result) => result.error !== undefined);
  const replyId = useId();
  const errorId = useId();

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="mt-4 flex flex-col gap-1.5">
      <input type="hidden" name="id" value={review.id} />
      <label htmlFor={replyId} className="text-sm font-medium">
        Reply, shown beneath the review on the shop
      </label>
      {/* Keyed by the reply as saved, so a fresh one from the server is what the box starts from. */}
      <textarea
        key={review.reply ?? ""}
        id={replyId}
        name="reply"
        rows={2}
        maxLength={REPLY_MAX}
        defaultValue={review.reply ?? ""}
        aria-invalid={state.error ? "true" : undefined}
        aria-describedby={state.error ? errorId : undefined}
        className={`${inputClass} resize-y`}
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}>
          {isPending ? "Saving…" : "Save reply"}
        </button>
        <p role="status" className={`text-sm ${ui.mutedOnPanel}`}>
          {state.saved && !isPending ? "Saved." : ""}
        </p>
        {state.error ? (
          <p id={errorId} className="text-sm text-red-700 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
