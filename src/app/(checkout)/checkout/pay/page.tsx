import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { PANEL } from "@/components/shop/customiser";
import { findBasketId, reviewAndSave } from "@/lib/basket/store";
import { madeToOrderNote, shortDetails } from "@/lib/basket/summary";
import { ui } from "@/lib/brand/ui";
import { basketMatchesOrder, detailsOf } from "@/lib/checkout/order";
import { db } from "@/lib/db";
import { formatPence } from "@/lib/money";
import { orderingOpen } from "@/lib/ordering";

export const metadata: Metadata = {
  title: "Ready to pay",
  robots: { index: false, follow: false },
};

/**
 * Ready to pay: the order Continue to payment saved, as Not paid, for a last
 * look. Card payment goes here once it is built; until then the order waits
 * in the admin as Not paid.
 *
 * The order is found by the basket that made it, so nothing about it is ever
 * in the address. Once the basket has moved on - something added, a price
 * changed - the shopper goes back through checkout to see it.
 */
export default async function PayPage() {
  // Rendered for each request, never at build: built while ordering was
  // closed, it would stay not found once ORDERING opens it.
  await connection();
  if (!orderingOpen()) notFound();

  const basketId = await findBasketId();
  if (!basketId) redirect("/basket");

  const order = await db.order.findFirst({
    where: { basketId, status: "PENDING" },
    include: { items: { orderBy: { id: "asc" } }, shippingAddress: true, discountCode: { select: { code: true } } },
  });
  if (!order) redirect("/checkout");

  const review = await reviewAndSave(basketId);
  const items = order.items.map((item) => ({ ...item, details: detailsOf(item.details) }));
  if (!basketMatchesOrder(review.lines, items)) redirect("/checkout");

  const address = order.shippingAddress;
  const sending = madeToOrderNote(review.lines);
  const label = "text-[13px] tracking-[0.1em] uppercase";

  return (
    <div className="mx-auto max-w-[720px] px-4 pt-12 sm:px-6">
      <p className={`text-[13px] font-semibold tracking-[0.14em] uppercase ${ui.shopAccent}`}>Order {order.orderNumber}</p>
      <h1 className={`mt-2 text-3xl tracking-tight ${ui.shopHeading}`}>Ready to pay</h1>
      <p className={`mt-2 ${ui.shopMuted}`}>Your order is saved. Have a last look, then pay, and we&apos;ll start on it.</p>

      <section aria-label="Your order" className={`mt-7 ${PANEL}`}>
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3.5">
              <div className="relative aspect-square rounded-lg bg-nyoki-soft-ash">
                {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="56px" className="rounded-lg object-cover" /> : null}
                {item.quantity > 1 ? (
                  <span className="absolute -top-2 -right-2 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-nyoki-navy px-1.5 text-xs font-medium text-nyoki-beige ring-2 ring-nyoki-white">
                    <span className="sr-only">Quantity </span>
                    {item.quantity}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-sm leading-snug font-medium text-nyoki-ink">{item.productName}</p>
                {item.details.length > 0 ? <p className={`mt-0.5 text-[12.5px] ${ui.shopMuted}`}>{shortDetails(item.details)}</p> : null}
              </div>
              <p className="text-sm tabular-nums">{formatPence(item.totalPence)}</p>
            </li>
          ))}
        </ul>

        <div className={`my-6 grid gap-6 border-y py-6 text-[15px] sm:grid-cols-2 ${ui.shopRule}`}>
          <div className="flex flex-col gap-0.5">
            <p className={`${label} ${ui.shopMuted}`}>Sending to</p>
            {address ? (
              <>
                <p className="font-medium">{address.name}</p>
                <p>{[address.line1, address.line2, address.city].filter(Boolean).join(", ")}</p>
                <p>{[address.county, address.postcode].filter(Boolean).join(" ")}</p>
              </>
            ) : null}
            {order.gift ? (
              <p className={`mt-1 text-sm ${ui.shopMuted}`}>
                A gift{order.giftNote ? ", with your note" : ""}
                {order.hidePrices ? ", prices left off" : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-0.5">
            <p className={`${label} ${ui.shopMuted}`}>How it&apos;s sent</p>
            <p className="font-medium">{order.shippingMethod}</p>
            {sending ? <p className="text-sm">{sending}</p> : null}
            <Link href="/checkout" className={`mt-1 self-start text-sm underline underline-offset-4 ${ui.shopMuted}`}>
              Change something
            </Link>
          </div>
        </div>

        <dl className="flex flex-col gap-2.5 tabular-nums">
          <div className="flex justify-between gap-4">
            <dt className={ui.shopMuted}>Subtotal</dt>
            <dd>{formatPence(order.subtotalPence)}</dd>
          </div>
          {order.discountPence > 0 ? (
            <div className="flex justify-between gap-4">
              <dt className={ui.shopMuted}>Promo code {order.discountCode?.code ?? ""}</dt>
              <dd>−{formatPence(order.discountPence)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className={ui.shopMuted}>Delivery</dt>
            <dd>{order.shippingPence === 0 ? "Free" : formatPence(order.shippingPence)}</dd>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-4">
            <dt className="font-medium text-nyoki-ink">Total</dt>
            <dd className="text-2xl font-semibold text-nyoki-ink">{formatPence(order.totalPence)}</dd>
          </div>
          <p className={`-mt-1 text-right text-[13px] ${ui.shopMuted}`}>Includes {formatPence(order.taxPence)} VAT</p>
        </dl>
      </section>

      {/* Where card payment goes, once it is built. */}
      <section className="mt-5 flex flex-col items-center gap-2.5 rounded-[20px] border-[1.5px] border-dashed border-nyoki-light-slate px-7 py-8 text-center">
        <svg viewBox="0 0 32 32" fill="none" strokeWidth="1.5" aria-hidden="true" className="size-8 stroke-nyoki-sage-deep">
          <rect x="4" y="8" width="24" height="17" rx="3" />
          <path d="M4 13h24M9 20h5" strokeLinecap="round" />
        </svg>
        <h2 className="font-medium text-nyoki-ink">Card payment goes here</h2>
        <p className={`max-w-md text-sm ${ui.shopMuted}`}>Payment is the next piece to build. Until then this order waits as Not paid.</p>
        <button
          type="button"
          disabled
          className="mt-2 h-11 rounded-full bg-nyoki-navy px-7 text-sm font-medium tracking-[0.12em] text-nyoki-beige uppercase disabled:opacity-60"
        >
          Pay {formatPence(order.totalPence)}
        </button>
      </section>
    </div>
  );
}
