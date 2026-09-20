"use client";

import { ui } from "@/lib/brand/ui";
import { useActionState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import type { PasswordChangeErrors } from "@/lib/admin/validate";

export interface ChangePasswordState {
  errors: PasswordChangeErrors;
  done: boolean;
}

export type ChangePasswordAction = (
  state: ChangePasswordState,
  formData: FormData,
) => Promise<ChangePasswordState>;

const EMPTY: ChangePasswordState = { errors: {}, done: false };

export function ChangePasswordForm({
  action,
  initialState = EMPTY,
}: {
  action: ChangePasswordAction;
  initialState?: ChangePasswordState;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors;

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {state.done ? (
        <p
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          Password changed. Use the new one next time you sign in.
        </p>
      ) : null}

      <Field label="Current password" name="currentPassword" error={errors.currentPassword}>
        {(props) => (
          <input {...props} type="password" autoComplete="current-password" required className={inputClass} />
        )}
      </Field>

      <Field
        label="New password"
        name="newPassword"
        error={errors.newPassword}
        hint="At least 12 characters. A few words you will remember work well."
      >
        {(props) => (
          <input {...props} type="password" autoComplete="new-password" required className={inputClass} />
        )}
      </Field>

      <Field label="Confirm new password" name="confirmPassword" error={errors.confirmPassword}>
        {(props) => (
          <input {...props} type="password" autoComplete="new-password" required className={inputClass} />
        )}
      </Field>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className={`rounded-md px-4 py-2.5 text-sm font-medium transition-opacity ${ui.buttonPrimary}`}
        >
          {isPending ? "Changing…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
