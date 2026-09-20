import type { Metadata } from "next";
import Link from "next/link";

import { changePassword, updateDetails } from "@/app/(shop)/account/actions";
import { DetailsForm } from "@/components/shop/details-form";
import { PasswordForm } from "@/components/shop/password-form";
import { requireCustomer } from "@/lib/account/dal";
import { ui } from "@/lib/brand/ui";

export const metadata: Metadata = {
  title: "Your details",
  robots: { index: false, follow: false },
};

export default async function DetailsPage() {
  const shopper = await requireCustomer();

  return (
    <div className="mx-auto max-w-shop px-4 py-12 sm:px-6">
      <Link href="/account" className={`text-sm underline underline-offset-4 ${ui.shopMuted}`}>
        Back to your account
      </Link>

      <h1 className={`mt-4 text-3xl tracking-tight ${ui.shopHeading}`}>Your details</h1>

      <div className="mt-10 flex flex-col gap-12">
        <section>
          <h2 className={`text-lg ${ui.shopHeading}`}>Name and email</h2>
          <div className="mt-5">
            <DetailsForm shopper={shopper} action={updateDetails} />
          </div>
        </section>

        <section className={`border-t pt-12 ${ui.shopRule}`}>
          <h2 className={`text-lg ${ui.shopHeading}`}>Password</h2>
          <div className="mt-5">
            <PasswordForm action={changePassword} />
          </div>
        </section>
      </div>
    </div>
  );
}
