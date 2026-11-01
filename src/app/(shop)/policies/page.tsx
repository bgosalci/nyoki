import type { Metadata } from "next";
import Link from "next/link";

import { BusinessDetails } from "@/components/shop/business-details";
import { ui } from "@/lib/brand/ui";
import { POLICIES, POLICIES_UPDATED, policyHref } from "@/lib/policies/pages";

export const metadata: Metadata = {
  title: "Policies",
  description: "Nyoki Handmade's delivery, returns, terms, privacy and cookies policies.",
};

/** Every policy, with a line on what each covers. */
export default function PoliciesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6">
      <h1 className={`text-4xl leading-tight tracking-tight ${ui.shopHeading}`}>Policies</h1>
      <p className={`mt-4 leading-relaxed ${ui.shopMuted}`}>
        How we deliver, what happens if something isn&apos;t right, and how we look after your information - in plain
        words. Last updated {POLICIES_UPDATED}.
      </p>

      <ul className="mt-10 flex flex-col gap-4">
        {POLICIES.map((policy) => (
          <li key={policy.slug} className={`relative rounded-lg border bg-nyoki-white px-5 py-4 hover:border-nyoki-navy ${ui.shopRule}`}>
            {/* The link stretches over the card, so the whole card is one target. */}
            <Link href={policyHref(policy)} className={`text-lg font-medium after:absolute after:inset-0 ${ui.shopHeading}`}>
              {policy.title}
            </Link>
            <p className={`mt-1 text-sm leading-relaxed ${ui.shopMuted}`}>{policy.summary}</p>
          </li>
        ))}
      </ul>

      <BusinessDetails className="mt-10" />
    </div>
  );
}
