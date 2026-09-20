"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ShopField, shopInputClass } from "@/components/shop/field";
import { ui } from "@/lib/brand/ui";

export interface SignInState {
  error: string | null;
  /** Echoed back on failure so the address does not have to be retyped. */
  email?: string;
}

export type SignInAction = (state: SignInState, formData: FormData) => Promise<SignInState>;

const EMPTY: SignInState = { error: null };

/**
 * The action is a prop rather than a direct import so the form can be rendered
 * in tests without a server runtime.
 */
export function SignInForm({
  action,
  initialState = EMPTY,
}: {
  action: SignInAction;
  initialState?: SignInState;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <ShopField label="Email" name="email">
        {(props) => (
          <input
            {...props}
            type="email"
            autoComplete="username"
            defaultValue={state.email ?? ""}
            required
            className={shopInputClass}
          />
        )}
      </ShopField>

      <ShopField label="Password" name="password">
        {(props) => (
          <input {...props} type="password" autoComplete="current-password" required className={shopInputClass} />
        )}
      </ShopField>

      <button
        type="submit"
        disabled={isPending}
        className={`px-6 py-3 text-xs tracking-[0.14em] uppercase disabled:opacity-60 ${ui.shopButton}`}
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <p className={`text-sm ${ui.shopMuted}`}>
        New here?{" "}
        <Link href="/account/register" className="underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
