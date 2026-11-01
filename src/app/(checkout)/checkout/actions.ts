"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { currentCustomer } from "@/lib/account/dal";
import { findBasketId, ratesFor, reviewAndSave } from "@/lib/basket/store";
import { orderItems } from "@/lib/checkout/order";
import { checkoutTotals } from "@/lib/checkout/totals";
import { parseCheckout, type CheckoutErrors } from "@/lib/checkout/validate";
import { db } from "@/lib/db";
import { codeRedeemability, normaliseCode } from "@/lib/discounts/validate";
import { formatPence } from "@/lib/money";
import { orderingOpen } from "@/lib/ordering";
import { CODE_MISSES_PER_ADDRESS, WAIT_A_WHILE, attempt, requestAddress } from "@/lib/rate-limit";

const CLOSED = "Online ordering opens soon.";
const EMPTY = "Your basket is empty.";

export interface CheckoutState {
  errors: CheckoutErrors;
  /** Something about the whole checkout, said above the button. */
  notice?: string;
}

export type CodeResult = { ok: true; code: string; discountPence: number; label: string } | { ok: false; message: string };

/** What a code is, in a few words: "10% off", "£5.00 off". */
function describe(code: { type: string; value: number }): string {
  return code.type === "PERCENTAGE" ? `${code.value}% off` : `${formatPence(code.value)} off`;
}

/**
 * Whether trying a code was a miss, for the limit on guessing at codes: no
 * such code, or one not available. One that works is no miss, and nor is one
 * refused for its minimum spend - its message already says it exists, and
 * trying it again as the basket grows is shopping, not guessing.
 */
function isMiss(result: ReturnType<typeof codeRedeemability> | null): boolean {
  return result === null || (!result.ok && !result.shortOfMinimum);
}

/**
 * Tries a promo code against the basket as it stands. Every reason a code
 * cannot be used reads the same, so guessing at codes learns nothing; a
 * minimum spend is the exception, since the shopper can act on it. Nothing
 * is kept: the code rides in the checkout form, and is checked again when it
 * is sent.
 */
export async function applyCode(raw: string): Promise<CodeResult> {
  if (!orderingOpen()) return { ok: false, message: CLOSED };

  const code = normaliseCode(raw);
  if (code === "") return { ok: false, message: "Type a code first." };

  const basketId = await findBasketId();
  if (!basketId) return { ok: false, message: EMPTY };
  const { subtotalPence } = await reviewAndSave(basketId);

  // Codes are words, and words can be guessed: an address that has missed
  // too often is not looked up for a while.
  const guess = await attempt(CODE_MISSES_PER_ADDRESS, await requestAddress());
  if (guess.over) return { ok: false, message: WAIT_A_WHILE };

  const row = await db.discountCode.findUnique({ where: { code } });
  const result = row ? codeRedeemability(row, { now: new Date(), subtotalPence }) : null;
  if (!isMiss(result)) await guess.forget();
  if (!row || !result?.ok) return { ok: false, message: result && !result.ok ? result.reason : "That code is not available." };
  return { ok: true, code, discountPence: result.discountPence, label: describe(row) };
}

/**
 * Continue to payment: checks everything again on the server, then saves the
 * order as Not paid - every line's name, code, photo, price, VAT rate and
 * choices copied onto it - and goes on to Ready to pay. Payment is not built
 * yet; this is where it will pick the order up.
 *
 * Going back to change something updates the order already waiting for this
 * basket rather than making a second. The address the order goes to is its
 * own row, joined to no account, so editing a saved address later cannot
 * move an order; "Save it to your account" makes a second, saved copy.
 */
export async function continueToPayment(_state: CheckoutState, formData: FormData): Promise<CheckoutState> {
  if (!orderingOpen()) return { errors: {}, notice: CLOSED };

  const basketId = await findBasketId();
  if (!basketId) return { errors: {}, notice: EMPTY };

  const review = await reviewAndSave(basketId);
  if (review.lines.length === 0) return { errors: {}, notice: EMPTY };
  // Something moved on the way - a price, the stock. The shopper sees it before paying for it.
  if (review.changes.length > 0) {
    refresh();
    return { errors: {}, notice: `Your basket has changed. ${review.changes.join(" ")}` };
  }

  const shopper = await currentCustomer();
  const parsed = parseCheckout(formData, { shopperEmail: shopper?.email ?? null });
  if (!parsed.ok) return { errors: parsed.errors };
  const input = parsed.data;

  // Priced afresh for the basket's parcel, as checkout showed it.
  const rate = (await ratesFor(review.lines)).find((option) => option.id === input.rateId);
  if (!rate) return { errors: { rate: "That way of sending it is no longer offered. Please choose another." } };

  let address;
  if (input.address.kind === "saved") {
    const saved = shopper
      ? await db.address.findFirst({
          where: { id: input.address.id, customerId: shopper.id },
          select: { name: true, line1: true, line2: true, city: true, county: true, postcode: true, phone: true },
        })
      : null;
    if (!saved) return { errors: { address: "Choose where it should go." } };
    address = { ...saved, phone: input.phone ?? saved.phone };
  } else {
    const { kind: _kind, ...fields } = input.address;
    address = { ...fields, phone: input.phone };
  }

  let discount = { pence: 0, codeId: null as string | null };
  if (input.code) {
    // Held to the same limit as trying a code, or this would be the way round it.
    const guess = await attempt(CODE_MISSES_PER_ADDRESS, await requestAddress());
    if (guess.over) return { errors: { code: WAIT_A_WHILE } };

    const row = await db.discountCode.findUnique({ where: { code: input.code } });
    const result = row ? codeRedeemability(row, { now: new Date(), subtotalPence: review.subtotalPence }) : null;
    if (!isMiss(result)) await guess.forget();
    if (!row || !result?.ok) return { errors: { code: result && !result.ok ? result.reason : "That code is not available." } };
    discount = { pence: result.discountPence, codeId: row.id };
  }

  const totals = checkoutTotals({ lines: review.lines, discountPence: discount.pence, rate });

  await db.$transaction(async (tx) => {
    // A guest is a customer with no password, found by email. One already
    // there - a guest before, or an account - is never changed from here.
    const customerId = shopper
      ? shopper.id
      : (await tx.customer.upsert({ where: { email: input.email }, create: { email: input.email, phone: input.phone }, update: {} })).id;

    const shipping = await tx.address.create({ data: { customerId: null, ...address, country: "GB" } });

    if (shopper && input.saveAddress) {
      const same = await tx.address.findFirst({
        where: { customerId: shopper.id, name: address.name, line1: address.line1, postcode: address.postcode },
        select: { id: true },
      });
      if (!same) await tx.address.create({ data: { customerId: shopper.id, ...address, country: "GB" } });
    }

    const order = {
      status: "PENDING" as const,
      basketId,
      customerId,
      email: input.email,
      signedIn: shopper !== null,
      subtotalPence: totals.subtotalPence,
      discountPence: totals.discountPence,
      shippingPence: totals.deliveryPence ?? 0,
      taxPence: totals.vatPence,
      totalPence: totals.totalPence,
      discountCodeId: discount.codeId,
      shippingAddressId: shipping.id,
      shippingMethod: rate.name,
      parcelSize: rate.parcel?.size ?? null,
      parcelGrams: rate.parcel?.grams ?? null,
      parcelMm: rate.parcel?.mm ?? null,
      gift: input.gift,
      giftNote: input.giftNote,
      hidePrices: input.hidePrices,
      items: { create: orderItems(review.lines) },
    };

    const waiting = await tx.order.findFirst({ where: { basketId, status: "PENDING" }, select: { id: true, shippingAddressId: true } });
    if (waiting) {
      await tx.orderItem.deleteMany({ where: { orderId: waiting.id } });
      await tx.order.update({ where: { id: waiting.id }, data: order });
      // The old copy of the address belonged to this order alone.
      if (waiting.shippingAddressId) await tx.address.deleteMany({ where: { id: waiting.shippingAddressId, customerId: null } });
    } else {
      await tx.order.create({ data: order });
    }
  });

  // redirect() signals by throwing, so it sits outside the transaction.
  redirect("/checkout/pay");
}
