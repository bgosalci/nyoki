"use client";

import { ShopField, shopInputClass } from "@/components/shop/field";
import type { Shopper } from "@/lib/account/dal";
import type { CustomerDetailsErrors } from "@/lib/account/validate";
import { ui } from "@/lib/brand/ui";
import { useActionForm } from "@/lib/forms/action-form";

export interface DetailsState {
  errors: CustomerDetailsErrors;
  saved?: boolean;
}

export type DetailsAction = (state: DetailsState, formData: FormData) => Promise<DetailsState>;

const EMPTY: DetailsState = { errors: {} };

export function DetailsForm({
  shopper,
  action,
  initialState = EMPTY,
}: {
  shopper: Shopper;
  action: DetailsAction;
  initialState?: DetailsState;
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(action, initialState, (result) => Object.keys(result.errors).length > 0);

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex max-w-sm flex-col gap-5">
      {state.saved ? (
        <p role="status" className="rounded border border-nyoki-sage bg-nyoki-sage/20 px-3 py-2 text-sm">
          Saved.
        </p>
      ) : null}

      <ShopField label="Your name" name="name" error={state.errors.name}>
        {(props) => (
          <input
            {...props}
            type="text"
            autoComplete="name"
            defaultValue={shopper.name ?? ""}
            required
            className={shopInputClass}
          />
        )}
      </ShopField>

      <ShopField
        label="Email"
        name="email"
        error={state.errors.email}
        hint="This is what you sign in with."
      >
        {(props) => (
          <input
            {...props}
            type="email"
            autoComplete="email"
            defaultValue={shopper.email}
            required
            className={shopInputClass}
          />
        )}
      </ShopField>

      <button
        type="submit"
        disabled={isPending}
        className={`self-start px-6 py-3 text-xs tracking-[0.14em] uppercase disabled:opacity-60 ${ui.shopButton}`}
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
