import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signIn } from "@/app/(shop)/account/actions";
import { SignInForm } from "@/components/shop/sign-in-form";
import { currentCustomer } from "@/lib/account/dal";
import { ui } from "@/lib/brand/ui";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  // Nobody signed in needs this page, and landing on it reads as being
  // signed out.
  if (await currentCustomer()) redirect("/account");

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16 sm:px-6">
      <h1 className={`text-3xl tracking-tight ${ui.shopHeading}`}>Sign in</h1>
      <p className={`mt-3 mb-8 text-sm leading-relaxed ${ui.shopMuted}`}>
        For your orders and the pieces you have saved.
      </p>

      <SignInForm action={signIn} />
    </div>
  );
}
