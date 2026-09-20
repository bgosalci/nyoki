"use client";

import { ui } from "@/lib/brand/ui";
import { useActionState } from "react";

import { inputClass } from "@/components/admin/field";

export interface LoginState {
  error: string | null;
  /** Echoed back on failure so the address does not have to be retyped. */
  email?: string;
}

export type LoginAction = (
  state: LoginState,
  formData: FormData,
) => Promise<LoginState>;

const EMPTY: LoginState = { error: null };

/**
 * The action is a prop rather than a direct import so the form can be rendered
 * in tests without a server runtime.
 */
export function LoginForm({
  action,
  initialState = EMPTY,
}: {
  action: LoginAction;
  initialState?: LoginState;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email ?? ""}
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`rounded-md px-4 py-2.5 text-sm font-medium transition-opacity ${ui.buttonPrimary}`}
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
