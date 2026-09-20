"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ShopField, shopInputClass } from "@/components/shop/field";
import { ui } from "@/lib/brand/ui";
import { MIN_CUSTOMER_PASSWORD_LENGTH, type RegistrationErrors } from "@/lib/account/validate";

export interface RegisterState {
  errors: RegistrationErrors;
  /** Echoed back on failure. The password never is. */
  values?: { name: string; email: string };
}

export type RegisterAction = (state: RegisterState, formData: FormData) => Promise<RegisterState>;

const EMPTY: RegisterState = { errors: {} };

export function RegisterForm({
  action,
  initialState = EMPTY,
}: {
  action: RegisterAction;
  initialState?: RegisterState;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <ShopField label="Your name" name="name" error={state.errors.name}>
        {(props) => (
          <input
            {...props}
            type="text"
            autoComplete="name"
            defaultValue={state.values?.name ?? ""}
            required
            className={shopInputClass}
          />
        )}
      </ShopField>

      <ShopField label="Email" name="email" error={state.errors.email}>
        {(props) => (
          <input
            {...props}
            type="email"
            autoComplete="username"
            defaultValue={state.values?.email ?? ""}
            required
            className={shopInputClass}
          />
        )}
      </ShopField>

      <ShopField
        label="Password"
        name="password"
        error={state.errors.password}
        hint={`At least ${MIN_CUSTOMER_PASSWORD_LENGTH} characters. A few words you will remember beats a short tangle you will not.`}
      >
        {(props) => (
          <input {...props} type="password" autoComplete="new-password" required className={shopInputClass} />
        )}
      </ShopField>

      <button
        type="submit"
        disabled={isPending}
        className={`px-6 py-3 text-xs tracking-[0.14em] uppercase disabled:opacity-60 ${ui.shopButton}`}
      >
        {isPending ? "Creating…" : "Create account"}
      </button>

      <p className={`text-sm ${ui.shopMuted}`}>
        Already have one?{" "}
        <Link href="/account/sign-in" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
