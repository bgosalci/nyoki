"use client";

import { useEffect, useId, useState } from "react";

import { ShopField, shopInputClass } from "@/components/shop/field";
import { STAR_PATH } from "@/components/stars";
import { ui } from "@/lib/brand/ui";
import { useActionForm } from "@/lib/forms/action-form";
import { useFocusFirstError } from "@/lib/forms/first-error";
import { BODY_MAX, NAME_MAX, RATINGS, type ReviewErrors } from "@/lib/reviews/validate";

export interface ReviewState {
  errors: ReviewErrors;
  /** Why nothing was kept, when it is nothing the shopper wrote: not signed in, or too many too fast. */
  notice?: string;
  /** Set once the review is kept. */
  sent?: true;
}

export type ReviewAction = (state: ReviewState, formData: FormData) => Promise<ReviewState>;

const EMPTY: ReviewState = { errors: {} };

const starName = (stars: number) => `${stars} star${stars === 1 ? "" : "s"}`;

/**
 * Writing a review of a piece, or changing one: one to five stars, a few
 * words, and the name to show with them. Written signed in; the action says
 * whose it is.
 *
 * The stars are five radios, so the keyboard moves through them with the
 * arrows as any set of choices; each is drawn as a star, filled up to the
 * one chosen. The action is a prop, so the form renders in tests without a
 * server. What was written is kept when something is wrong
 * (`useActionForm`), and a rejected send goes to its first problem.
 */
export function ReviewForm({
  action,
  productId,
  defaults,
  editing = false,
  onSent,
  onCancel,
}: {
  action: ReviewAction;
  productId: string;
  /** What the form starts from: the review being changed, or nothing but the name to show. */
  defaults: { rating: number | null; body: string; name: string };
  /** Changing a review already written. */
  editing?: boolean;
  /** Called once the review is kept, in place of the thank-you. */
  onSent?: () => void;
  onCancel?: () => void;
}) {
  const { state, formAction, isPending, formRef, onSubmit, rejection } = useActionForm(action, EMPTY, (result) => !result.sent);
  useFocusFirstError(formRef, rejection);
  const { errors } = state;
  // What the stars draw. The radios keep their own value, so the form's
  // reset and restore after a rejected send leave them as they were sent.
  const [chosen, setChosen] = useState(defaults.rating);
  const ratingError = useId();

  useEffect(() => {
    if (state.sent) onSent?.();
  }, [state, onSent]);

  if (state.sent && !onSent) {
    return (
      <p role="status" className={`rounded border px-4 py-3 text-sm leading-relaxed ${ui.shopRule} ${ui.shopSurface}`}>
        Thank you. We read every review before it goes on the shop, and yours will be there once we have.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {state.notice ? (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.notice}
        </p>
      ) : null}

      <input type="hidden" name="productId" value={productId} />

      <fieldset data-invalid={errors.rating ? "" : undefined} aria-describedby={errors.rating ? ratingError : undefined} className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">Your rating</legend>
        <div className="mt-1.5 flex text-nyoki-navy">
          {RATINGS.map((stars) => (
            <label
              key={stars}
              className="cursor-pointer rounded p-1 has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-nyoki-navy"
            >
              <input
                type="radio"
                name="rating"
                value={stars}
                defaultChecked={defaults.rating === stars}
                onChange={() => setChosen(stars)}
                className="sr-only"
              />
              <span className="sr-only">{starName(stars)}</span>
              <svg
                viewBox="0 0 24 24"
                fill={chosen !== null && stars <= chosen ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-8"
              >
                <path d={STAR_PATH} />
              </svg>
            </label>
          ))}
        </div>
        {errors.rating ? (
          <p id={ratingError} className="text-xs text-red-700">
            {errors.rating}
          </p>
        ) : null}
      </fieldset>

      <ShopField label="Write your review" name="body" error={errors.body} hint="What you thought of it, as you would tell a friend.">
        {(props) => <textarea {...props} rows={5} maxLength={BODY_MAX} defaultValue={defaults.body} className={`${shopInputClass} resize-y`} />}
      </ShopField>

      <ShopField label="Name shown with your review" name="name" error={errors.name} hint="Shown beside your review. Your email address never is.">
        {(props) => <input {...props} type="text" autoComplete="nickname" maxLength={NAME_MAX} defaultValue={defaults.name} className={shopInputClass} />}
      </ShopField>

      {editing ? (
        <p className={`text-sm leading-relaxed ${ui.shopMuted}`}>
          A changed review is read again before it goes back on the shop, so it comes off the page until then.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={`px-6 py-3 text-xs tracking-[0.14em] uppercase disabled:opacity-60 ${ui.shopButton}`}
        >
          {isPending ? "Sending…" : editing ? "Send changes" : "Send review"}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className={`px-6 py-3 text-xs tracking-[0.14em] uppercase ${ui.shopButtonOutline}`}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
