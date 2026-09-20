import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { register } from "@/app/(shop)/account/actions";
import { RegisterForm } from "@/components/shop/register-form";
import { currentCustomer } from "@/lib/account/dal";
import { ui } from "@/lib/brand/ui";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  if (await currentCustomer()) redirect("/account");

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16 sm:px-6">
      <h1 className={`text-3xl tracking-tight ${ui.shopHeading}`}>Create an account</h1>
      <p className={`mt-3 mb-8 text-sm leading-relaxed ${ui.shopMuted}`}>
        To keep your orders in one place and save the pieces you like for later.
      </p>

      <RegisterForm action={register} />
    </div>
  );
}
