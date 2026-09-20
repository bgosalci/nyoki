"use client";

import { useActionState, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";

import { ui } from "@/lib/brand/ui";

export interface ResetPasswordState {
  /** Set once, on success. Exists nowhere else in plain text. */
  password: string | null;
  error: string | null;
}

export type ResetPasswordAction = (state: ResetPasswordState, formData: FormData) => Promise<ResetPasswordState>;

const EMPTY: ResetPasswordState = { password: null, error: null };

export function ResetPasswordButton({
  action,
  name,
  initialState = EMPTY,
}: {
  action: ResetPasswordAction;
  name: string;
  initialState?: ResetPasswordState;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex max-w-md flex-col gap-3">
      {state.password ? (
        <div role="status" className="flex flex-col gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <p>New password for {name}:</p>
          <p className="font-mono text-base tracking-wide select-all">{state.password}</p>
          <p>Copy it now and pass it on — it won&apos;t be shown again.</p>
        </div>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      <div>
        <button type="button" onClick={() => setConfirming(true)} disabled={isPending} aria-label={`Reset ${name}'s password`} className={`rounded-md px-4 py-2.5 text-sm font-medium ${ui.buttonSecondary}`}>
          {isPending ? "Resetting…" : "Reset password"}
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title={`Reset ${name}'s password?`}
        description="Their current password stops working straight away. You will be shown the new one once, to pass on."
        confirmLabel="Reset password"
        tone="primary"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          formRef.current?.requestSubmit();
        }}
      />
    </form>
  );
}
