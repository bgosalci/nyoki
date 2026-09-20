"use client";

import { useActionState } from "react";

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

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Remove ${name}'s account? They will no longer be able to sign in.`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <button
        type="submit"
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
  );
}
