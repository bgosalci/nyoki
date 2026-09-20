"use client";

import { useActionState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import type { NewAdminErrors } from "@/lib/admin/validate";

export interface NewAdminState {
  errors: NewAdminErrors;
  /** Set once, on success. The password exists nowhere else in plain text. */
  created: { email: string; password: string } | null;
}

export type NewAdminAction = (state: NewAdminState, formData: FormData) => Promise<NewAdminState>;

const EMPTY: NewAdminState = { errors: {}, created: null };

export function NewAdminForm({
  action,
  initialState = EMPTY,
}: {
  action: NewAdminAction;
  initialState?: NewAdminState;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors;

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {state.created ? (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
        >
          <p>
            Account created for <strong>{state.created.email}</strong>. Their password is:
          </p>
          <p className="font-mono text-base tracking-wide select-all">{state.created.password}</p>
          <p>
            Copy it now and pass it on — it won&apos;t be shown again. They can change it under
            Settings once signed in.
          </p>
        </div>
      ) : null}

      <Field label="Email" name="email" error={errors.email} hint="What they will sign in with.">
        {(props) => <input {...props} type="email" autoComplete="off" required className={inputClass} />}
      </Field>

      <Field label="Name" name="name" error={errors.name}>
        {(props) => <input {...props} type="text" autoComplete="off" required className={inputClass} />}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Role</legend>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="radio" name="role" value="STAFF" defaultChecked className="mt-0.5" />
          <span>
            Staff
            <span className="block text-xs text-black/60 dark:text-white/60">
              Products, photos, categories, sales and orders.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="radio" name="role" value="OWNER" className="mt-0.5" />
          <span>
            Owner
            <span className="block text-xs text-black/60 dark:text-white/60">
              Everything, including adding and removing accounts.
            </span>
          </span>
        </label>
        {errors.role ? <p className="text-xs text-red-600 dark:text-red-400">{errors.role}</p> : null}
      </fieldset>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {isPending ? "Creating…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
