import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { applyCode, continueToPayment } from "@/app/(checkout)/checkout/actions";
import { BasketChanges } from "@/components/shop/basket-changes";
import { CheckoutForm, type AppliedCode, type CheckoutPrefill } from "@/components/shop/checkout-form";
import { currentCustomer } from "@/lib/account/dal";
import { activeRates, findBasketId, reviewAndSave } from "@/lib/basket/store";
import { madeToOrderNote, shortDetails } from "@/lib/basket/summary";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { codeRedeemability } from "@/lib/discounts/validate";
import { formatPence } from "@/lib/money";
import { orderingOpen } from "@/lib/ordering";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

/**
 * Checkout, from the basket as it stands - priced afresh, and anything that
 * changed said at the top. Coming back from Ready to pay, the form starts
 * from the order already waiting, so nothing has to be typed twice.
 */
export default async function CheckoutPage() {
  // Rendered for each request, never at build: built while ordering was
  // closed, it would stay not found once ORDERING opens it.
  await connection();
  if (!orderingOpen()) notFound();

  const basketId = await findBasketId();
  if (!basketId) redirect("/basket");

  const [review, rates, shopper] = await Promise.all([reviewAndSave(basketId), activeRates(), currentCustomer()]);
  if (review.lines.length === 0) redirect("/basket");

  const [savedAddresses, waiting] = await Promise.all([
    shopper
      ? db.address.findMany({
          where: { customerId: shopper.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, name: true, line1: true, line2: true, city: true, county: true, postcode: true },
        })
      : [],
    db.order.findFirst({ where: { basketId, status: "PENDING" }, include: { shippingAddress: true, discountCode: true } }),
  ]);

  let prefill: CheckoutPrefill | undefined;
  if (waiting) {
    // The code it was given, if it still holds for the basket as it is now.
    let code: AppliedCode | null = null;
    if (waiting.discountCode) {
      const result = codeRedeemability(waiting.discountCode, { now: new Date(), subtotalPence: review.subtotalPence });
      if (result.ok) {
        const { type, value } = waiting.discountCode;
        code = { code: waiting.discountCode.code, discountPence: result.discountPence, label: type === "PERCENTAGE" ? `${value}% off` : `${formatPence(value)} off` };
      }
    }
    const address = waiting.shippingAddress;
    prefill = {
      email: waiting.email,
      phone: address?.phone ?? null,
      gift: waiting.gift,
      giftNote: waiting.giftNote,
      hidePrices: waiting.hidePrices,
      address: address
        ? { name: address.name, line1: address.line1, line2: address.line2, city: address.city, county: address.county, postcode: address.postcode }
        : null,
      rateId: rates.find((rate) => rate.name === waiting.shippingMethod)?.id ?? null,
      code,
    };
  }

  return (
    <div className="mx-auto max-w-shop px-4 pt-10 sm:px-6">
      <h1 className={`text-3xl tracking-tight ${ui.shopHeading}`}>Checkout</h1>
      <BasketChanges changes={review.changes} />
      <CheckoutForm
        lines={review.lines.map((line) => ({
          id: line.id,
          name: line.name,
          image: line.image,
          quantity: line.quantity,
          totalPence: line.totalPence,
          vatRate: line.vatRate,
          summary: shortDetails(line.details),
        }))}
        rates={rates}
        shopper={shopper ? { name: shopper.name, email: shopper.email } : null}
        savedAddresses={savedAddresses}
        madeToOrderNote={madeToOrderNote(review.lines)}
        prefill={prefill}
        action={continueToPayment}
        applyCode={applyCode}
      />
    </div>
  );
}
