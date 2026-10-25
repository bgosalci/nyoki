import type { Metadata } from "next";

import { askQuestion } from "@/app/(shop)/contact/actions";
import { QuestionForm } from "@/components/shop/question-form";
import { currentCustomer } from "@/lib/account/dal";
import { ui } from "@/lib/brand/ui";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Ask Nyoki Handmade about a piece, a size, an order for a gift, or anything else. We reply by email.",
};

/** Questions about anything; a question about a piece is asked on its own page. */
export default async function ContactPage() {
  const shopper = await currentCustomer();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-14 sm:px-6">
      <h1 className={`text-4xl leading-tight tracking-tight ${ui.shopHeading}`}>Get in touch</h1>
      <p className={`mt-4 mb-8 leading-relaxed ${ui.shopMuted}`}>
        A question about a piece, a size you cannot find, or something made for a gift - write to us here and we will
        reply by email.
      </p>

      <QuestionForm action={askQuestion} shopper={shopper ? { name: shopper.name, email: shopper.email } : undefined} />
    </div>
  );
}
