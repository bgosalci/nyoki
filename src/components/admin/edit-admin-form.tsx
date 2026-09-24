"use client";

import { Field, inputClass } from "@/components/admin/field";
import { ui } from "@/lib/brand/ui";
import type { AdminRole } from "@/lib/auth/session";
import { useActionForm } from "@/lib/forms/action-form";

export interface EditAdminState {
  errors: Partial<Record<"name" | "role", string>>;
  saved: boolean;
}

export type EditAdminAction = (state: EditAdminState, formData: FormData) => Promise<EditAdminState>;

const EMPTY: EditAdminState = { errors: {}, saved: false };

export function EditAdminForm({
  action,
  admin,
  initialState = EMPTY,
}: {
  action: EditAdminAction;
  admin: { name: string; role: AdminRole };
  initialState?: EditAdminState;
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(action, initialState, (result) => Object.keys(result.errors).length > 0);
  const errors = state.errors;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex max-w-md flex-col gap-5">
      {state.saved ? (
        <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Saved.
        </p>
      ) : null}

      <Field label="Name" name="name" error={errors.name}>
        {(props) => <input {...props} type="text" defaultValue={admin.name} required className={inputClass} />}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Role</legend>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="radio" name="role" value="STAFF" defaultChecked={admin.role === "STAFF"} />
          Staff
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="radio" name="role" value="OWNER" defaultChecked={admin.role === "OWNER"} />
          Owner
        </label>
        {errors.role ? <p className="text-xs text-red-600 dark:text-red-400">{errors.role}</p> : null}
      </fieldset>

      <div>
        <button type="submit" disabled={isPending} className={`rounded-md px-4 py-2.5 text-sm font-medium transition-opacity ${ui.buttonPrimary}`}>
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
