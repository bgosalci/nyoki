"use client";

import { useActionState } from "react";

import { ShopField, shopInputClass } from "@/components/shop/field";
import { MIN_CUSTOMER_PASSWORD_LENGTH, type CustomerPasswordErrors } from "@/lib/account/validate";
import { ui } from "@/lib/brand/ui";

export interface PasswordState {
  errors: CustomerPasswordErrors;
  changed?: boolean;
}

export type PasswordAction = (state: PasswordState, formData: FormData) => Promise<PasswordState>;

const EMPTY: PasswordState = { errors: {} };

/**
 * Nothing typed here is ever echoed back, whatever went wrong: a password in
 * a rendered value is a password in the browser's history and in any cache
 * between here and there.
 */
export function PasswordForm({
  action,
  initialState = EMPTY,
}: {
  action: PasswordAction;
  initialState?: PasswordState;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-5">
      {state.changed ? (
        <p role="status" className="rounded border border-nyoki-sage bg-nyoki-sage/20 px-3 py-2 text-sm">
          Password changed.
        </p>
      ) : null}

      <ShopField label="Current password" name="currentPassword" error={state.errors.currentPassword}>
        {(props) => (
          <input {...props} type="password" autoComplete="current-password" required className={shopInputClass} />
        )}
      </ShopField>

      <ShopField
        label="New password"
        name="newPassword"
        error={state.errors.newPassword}
        hint={`At least ${MIN_CUSTOMER_PASSWORD_LENGTH} characters.`}
      >
        {(props) => (
          <input {...props} type="password" autoComplete="new-password" required className={shopInputClass} />
        )}
      </ShopField>

      <ShopField label="Repeat the new password" name="confirmPassword" error={state.errors.confirmPassword}>
        {(props) => (
          <input {...props} type="password" autoComplete="new-password" required className={shopInputClass} />
        )}
      </ShopField>

      <button
        type="submit"
        disabled={isPending}
        className={`self-start px-6 py-3 text-xs tracking-[0.14em] uppercase disabled:opacity-60 ${ui.shopButton}`}
      >
        {isPending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
