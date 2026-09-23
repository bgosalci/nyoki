"use client";

import { useActionState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { ui } from "@/lib/brand/ui";
import type { HomeContent, HomeErrors } from "@/lib/home/content";

export interface HomeState {
  errors: HomeErrors;
  saved?: boolean;
}

export type HomeAction = (state: HomeState, formData: FormData) => Promise<HomeState>;

/** Three boxes, always. An emptied one drops that line from the strip. */
const PROMISE_SLOTS = 3;

const EMPTY: HomeState = { errors: {} };

export function HomeForm({
  content,
  products,
  action,
  initialState = EMPTY,
}: {
  content: HomeContent;
  /** Pieces that could lead the page: on the shop, and with a photo. */
  products: { id: string; name: string }[];
  action: HomeAction;
  initialState?: HomeState;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-8 flex max-w-2xl flex-col gap-6">
      {state.saved ? (
        <p role="status" className={`rounded-md border px-3 py-2 text-sm ${ui.card} ${ui.rule}`}>
          Saved. The shop shows it now.
        </p>
      ) : null}

      <Field label="Headline" name="headline" error={state.errors.headline}>
        {(props) => <input {...props} type="text" defaultValue={content.headline} required className={inputClass} />}
      </Field>

      <Field
        label="Opening paragraph"
        name="intro"
        error={state.errors.intro}
        hint="Leave empty to show the headline on its own."
      >
        {(props) => <textarea {...props} rows={3} defaultValue={content.intro ?? ""} className={inputClass} />}
      </Field>

      <Field label="Button" name="ctaLabel" error={state.errors.ctaLabel} hint="It always leads to the whole shop.">
        {(props) => <input {...props} type="text" defaultValue={content.ctaLabel} required className={inputClass} />}
      </Field>

      <Field
        label="Main photo"
        name="heroProductId"
        hint="The newest piece with a photo, unless you choose one."
      >
        {(props) => (
          <select {...props} defaultValue={content.heroProductId ?? ""} className={inputClass}>
            <option value="">The newest piece with a photo</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Our promises</legend>
        <p className={`text-xs ${ui.mutedOnPage}`}>
          The green strip across the page. Empty all three to take it off.
        </p>

        {Array.from({ length: PROMISE_SLOTS }, (_, index) => (
          <Field key={index} label={`Promise ${index + 1}`} name="promises" error={index === 0 ? state.errors.promises : undefined}>
            {(props) => (
              <input {...props} type="text" defaultValue={content.promises[index] ?? ""} className={inputClass} />
            )}
          </Field>
        ))}
      </fieldset>

      <Field
        label="Heading above the pieces"
        name="featuredHeading"
        error={state.errors.featuredHeading}
        hint="The row below the promises. It shows the pieces you have marked featured, or the newest ones."
      >
        {(props) => (
          <input {...props} type="text" defaultValue={content.featuredHeading} required className={inputClass} />
        )}
      </Field>

      <button
        type="submit"
        disabled={isPending}
        className={`self-start rounded-md px-4 py-2.5 text-sm font-medium ${ui.buttonPrimary}`}
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
