"use client";

import { useActionState, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";

export interface RemoveAdminState {
  error: string | null;
}

export type RemoveAdminAction = (state: RemoveAdminState, formData: FormData) => Promise<RemoveAdminState>;

const EMPTY: RemoveAdminState = { error: null };

export function RemoveAdminButton({
  action,
  name,
  initialState = EMPTY,
}: {
  action: RemoveAdminAction;
  name: string;
  initialState?: RemoveAdminState;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={formAction} className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={isPending}
          aria-label={`Remove ${name}`}
          className="text-sm text-red-700 underline underline-offset-4 disabled:opacity-60 dark:text-red-300"
        >
          Remove
        </button>
        {state.error ? (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
      </form>
      <ConfirmDialog
        open={confirming}
        title={`Remove ${name}'s account?`}
        description="They will no longer be able to sign in. Anything they added stays."
        confirmLabel="Remove account"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
