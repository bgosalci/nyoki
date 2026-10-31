"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState, useTransition } from "react";

import type { CheckoutState, CodeResult } from "@/app/(checkout)/checkout/actions";
import { INPUT, PANEL, PANEL_SURFACE, Tile, TileGroup } from "@/components/shop/customiser";
import { ShopField } from "@/components/shop/field";
import { ui } from "@/lib/brand/ui";
import { checkoutTotals, deliveryPence, freeOption, type DeliveryRate, type Totals } from "@/lib/checkout/totals";
import { GIFT_NOTE_MAX } from "@/lib/checkout/validate";
import { deliveryDays } from "@/lib/delivery/validate";
import { useActionForm } from "@/lib/forms/action-form";
import { formatPence } from "@/lib/money";

/**
 * Checkout, on one page: your details, who it is for, where it goes and how
 * it is sent, beside the order and its total.
 *
 * The total follows every choice as it is made, worked out by the same
 * `checkoutTotals` the server saves the order by - and the server works it
 * out again when Continue to payment is pressed, so nothing here is trusted.
 * The promo code is tried as it is applied and rides in the form.
 *
 * On a computer the order sits beside the form; on a phone it folds to one
 * line at the top, and the total and Continue are held in the slim bar at
 * the foot, as Add to basket and Checkout are.
 */

export interface CheckoutLine {
  id: string;
  name: string;
  image: string | null;
  quantity: number;
  totalPence: number;
  vatRate: number;
  /** The choices in a few words: "Pack of 3 · Printed message". */
  summary: string;
}

export interface AddressFields {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  county: string | null;
  postcode: string;
}

export interface SavedAddress extends AddressFields {
  id: string;
}

export interface AppliedCode {
  code: string;
  discountPence: number;
  label: string;
}

/** The order already waiting, when the shopper comes back to change something. */
export interface CheckoutPrefill {
  email: string;
  phone: string | null;
  gift: boolean;
  giftNote: string | null;
  hidePrices: boolean;
  address: AddressFields | null;
  rateId: string | null;
  code: AppliedCode | null;
}

export interface CheckoutFormProps {
  lines: CheckoutLine[];
  rates: DeliveryRate[];
  shopper: { name: string | null; email: string } | null;
  savedAddresses: SavedAddress[];
  madeToOrderNote: string | null;
  prefill?: CheckoutPrefill;
  initialState?: CheckoutState;
  action: (state: CheckoutState, formData: FormData) => Promise<CheckoutState>;
  applyCode: (code: string) => Promise<CodeResult>;
}

const EMPTY: CheckoutState = { errors: {} };

const sameAddress = (a: AddressFields, b: AddressFields) => a.line1 === b.line1 && a.postcode === b.postcode && a.name === b.name;

export function CheckoutForm({
  lines,
  rates,
  shopper,
  savedAddresses,
  madeToOrderNote,
  prefill,
  initialState = EMPTY,
  action,
  applyCode,
}: CheckoutFormProps) {
  const formId = useId();
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(
    action,
    initialState,
    (result) => Object.keys(result.errors).length > 0 || Boolean(result.notice),
  );
  const errors = state.errors;

  const [gift, setGift] = useState(prefill?.gift ?? false);
  const [giftNote, setGiftNote] = useState(prefill?.giftNote ?? "");
  const [addressChoice, setAddressChoice] = useState(() => {
    if (prefill?.address) return savedAddresses.find((saved) => sameAddress(saved, prefill.address!))?.id ?? "new";
    return savedAddresses[0]?.id ?? "new";
  });
  const [code, setCode] = useState<AppliedCode | null>(prefill?.code ?? null);
  // The free way, whenever there is one - coming back to change something
  // included, though faster was chosen before. Else the way chosen before;
  // else none, since a paid way is the shopper's to choose.
  const [rateId, setRateId] = useState<string | null>(() => {
    const start = checkoutTotals({ lines, discountPence: prefill?.code?.discountPence ?? 0, rate: null });
    const free = freeOption(rates, start.subtotalPence - start.discountPence);
    if (free) return free.id;
    return prefill?.rateId && rates.some((rate) => rate.id === prefill.rateId) ? prefill.rateId : null;
  });

  const rate = rates.find((option) => option.id === rateId) ?? null;
  const totals = checkoutTotals({ lines, discountPence: code?.discountPence ?? 0, rate });
  const goodsPence = totals.subtotalPence - totals.discountPence;
  const canSend = rates.length > 0;
  const newAddress = addressChoice === "new";
  const defaults = prefill?.address ?? (gift ? null : shopper?.name ? { name: shopper.name } : null);

  const summary = (
    <OrderSummary lines={lines} totals={totals} rate={rate} code={code} setCode={setCode} applyCode={applyCode} error={errors.code} />
  );

  return (
    <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-12">
      {/* On a phone or tablet the order folds to one line at the top. */}
      <details className={`group lg:hidden ${PANEL_SURFACE}`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <span className="group-open:hidden">Show your order</span>
            <span className="hidden group-open:inline">Hide your order</span>
            <svg viewBox="0 0 14 14" fill="none" strokeWidth="1.8" aria-hidden="true" className="size-3.5 stroke-nyoki-navy transition-transform group-open:rotate-180">
              <path d="m3 5 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-lg font-semibold tabular-nums">{formatPence(totals.totalPence)}</span>
        </summary>
        <div className={`border-t px-5 pt-5 pb-6 ${ui.shopRule}`}>{summary}</div>
      </details>

      <form id={formId} ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-5">
        <input type="hidden" name="code" value={code?.code ?? ""} />

        <section aria-labelledby={`${formId}-you`} className={PANEL}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id={`${formId}-you`} className={`text-xl font-medium tracking-tight ${ui.shopHeading}`}>
              Your details
            </h2>
            {shopper ? null : (
              <Link href="/account/sign-in?next=/checkout" className={`text-sm underline underline-offset-4 ${ui.shopMuted}`}>
                Have an account? Sign in
              </Link>
            )}
          </div>
          {shopper ? (
            <div className="mt-3 flex flex-col gap-0.5">
              {shopper.name ? <p className="font-medium">{shopper.name}</p> : null}
              <p className={ui.shopMuted}>{shopper.email}</p>
              <p className={`mt-1.5 text-sm ${ui.shopMuted}`}>
                Not you?{" "}
                <a href="/account/sign-out" className="underline underline-offset-4">
                  Sign out
                </a>
              </p>
            </div>
          ) : (
            <p className={`mt-1 text-[0.93rem] ${ui.shopMuted}`}>So we can reach you about your order.</p>
          )}
          <div className={`mt-5 grid gap-4 ${shopper ? "" : "sm:grid-cols-2"}`}>
            {shopper ? null : (
              <ShopField label="Email" name="email" error={errors.email}>
                {(props) => <input {...props} type="email" autoComplete="email" defaultValue={prefill?.email ?? ""} className={INPUT} />}
              </ShopField>
            )}
            <ShopField label="Phone (optional)" name="phone" error={errors.phone} hint="For the courier, if they need it.">
              {(props) => <input {...props} type="tel" autoComplete="tel" defaultValue={prefill?.phone ?? ""} className={INPUT} />}
            </ShopField>
          </div>
        </section>

        <section aria-labelledby={`${formId}-who`} className={PANEL}>
          <h2 id={`${formId}-who`} className={`text-xl font-medium tracking-tight ${ui.shopHeading}`}>
            Who is it for?
          </h2>
          <div className="mt-5">
            <TileGroup labelledBy={`${formId}-who`} describedBy={`${formId}-who`} className="sm:grid-cols-2">
              <Tile name="recipient" value="me" checked={!gift} onSelect={() => setGift(false)}>
                <span className="pr-6 font-medium">For me</span> <span className={`text-xs ${ui.shopMuted}`}>Sent to you</span>
              </Tile>
              <Tile name="recipient" value="gift" checked={gift} onSelect={() => setGift(true)}>
                <span className="pr-6 font-medium">A gift for someone else</span>{" "}
                <span className={`text-xs ${ui.shopMuted}`}>We send it straight to them</span>
              </Tile>
            </TileGroup>
          </div>
          {gift ? (
            <div className={`mt-5 flex flex-col gap-4 border-t pt-5 ${ui.shopRule}`}>
              <ShopField label="A note for the parcel (optional)" name="giftNote" error={errors.giftNote} hint={`${giftNote.length} / ${GIFT_NOTE_MAX}`}>
                {(props) => (
                  <textarea
                    {...props}
                    rows={3}
                    maxLength={GIFT_NOTE_MAX}
                    value={giftNote}
                    onChange={(event) => setGiftNote(event.target.value)}
                    placeholder="Happy birthday! Love from…"
                    className={`${INPUT} resize-y`}
                  />
                )}
              </ShopField>
              <label className="flex cursor-pointer items-center gap-3 text-[15px]">
                <input type="checkbox" name="hidePrices" defaultChecked={prefill?.hidePrices ?? true} className={`size-5 ${ui.checkbox}`} />
                Leave the prices off the delivery note
              </label>
            </div>
          ) : null}
        </section>

        <section aria-labelledby={`${formId}-where`} className={PANEL}>
          <h2 id={`${formId}-where`} className={`text-xl font-medium tracking-tight ${ui.shopHeading}`}>
            Where should it go?
          </h2>
          <p className={`mt-1 text-[0.93rem] ${ui.shopMuted}`}>
            {gift ? "Their name and address. " : ""}We deliver within the UK for now.
          </p>
          {errors.address ? <p className="mt-2 text-xs text-red-700">{errors.address}</p> : null}

          {savedAddresses.length > 0 ? (
            <div className="mt-5">
              <TileGroup labelledBy={`${formId}-where`} describedBy={`${formId}-where`} className="grid-cols-1">
                {savedAddresses.map((saved) => (
                  <Tile key={saved.id} name="address" value={saved.id} checked={addressChoice === saved.id} onSelect={() => setAddressChoice(saved.id)}>
                    <span className="pr-6 font-medium">{saved.name}</span>{" "}
                    <span className={`text-xs ${ui.shopMuted}`}>{[saved.line1, saved.line2, saved.city, saved.postcode].filter(Boolean).join(", ")}</span>
                  </Tile>
                ))}
                <Tile name="address" value="new" checked={newAddress} onSelect={() => setAddressChoice("new")}>
                  <span className="pr-6 font-medium">A new address</span>
                </Tile>
              </TileGroup>
            </div>
          ) : (
            <input type="hidden" name="address" value="new" />
          )}

          {newAddress ? (
            <div className={`flex flex-col gap-4 ${savedAddresses.length > 0 ? `mt-5 border-t pt-5 ${ui.shopRule}` : "mt-5"}`}>
              <ShopField label={gift ? "Their full name" : "Full name"} name="name" error={errors.name}>
                {(props) => <input {...props} type="text" autoComplete="shipping name" defaultValue={defaults?.name ?? ""} className={INPUT} />}
              </ShopField>
              <ShopField label="Address" name="line1" error={errors.line1}>
                {(props) => <input {...props} type="text" autoComplete="shipping address-line1" defaultValue={prefill?.address?.line1 ?? ""} className={INPUT} />}
              </ShopField>
              <ShopField label="Address, second line (optional)" name="line2">
                {(props) => (
                  <input
                    {...props}
                    type="text"
                    autoComplete="shipping address-line2"
                    defaultValue={prefill?.address?.line2 ?? ""}
                    placeholder="Flat, house name or building"
                    className={INPUT}
                  />
                )}
              </ShopField>
              <div className="grid gap-4 sm:grid-cols-2">
                <ShopField label="Town or city" name="city" error={errors.city}>
                  {(props) => <input {...props} type="text" autoComplete="shipping address-level2" defaultValue={prefill?.address?.city ?? ""} className={INPUT} />}
                </ShopField>
                <ShopField label="County (optional)" name="county">
                  {(props) => <input {...props} type="text" autoComplete="shipping address-level1" defaultValue={prefill?.address?.county ?? ""} className={INPUT} />}
                </ShopField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ShopField label="Postcode" name="postcode" error={errors.postcode}>
                  {(props) => (
                    <input
                      {...props}
                      type="text"
                      autoComplete="shipping postal-code"
                      autoCapitalize="characters"
                      defaultValue={prefill?.address?.postcode ?? ""}
                      className={INPUT}
                    />
                  )}
                </ShopField>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Country</span>
                  <p className="rounded-[14px] px-4 py-3 ring-1 ring-nyoki-light-slate ring-inset">United Kingdom</p>
                </div>
              </div>
              {shopper ? (
                <label className="flex cursor-pointer items-center gap-3 text-[15px]">
                  <input type="checkbox" name="saveAddress" className={`size-5 ${ui.checkbox}`} />
                  Save it to your account
                </label>
              ) : null}
            </div>
          ) : null}
        </section>

        <section aria-labelledby={`${formId}-how`} className={PANEL}>
          <h2 id={`${formId}-how`} className={`text-xl font-medium tracking-tight ${ui.shopHeading}`}>
            Delivery
          </h2>
          {canSend ? (
            <div className="mt-5">
              <TileGroup labelledBy={`${formId}-how`} describedBy={`${formId}-how`} error={errors.rate} className="grid-cols-1">
                {rates.map((option) => {
                  const pence = deliveryPence(option, goodsPence);
                  const days = deliveryDays(option);
                  return (
                    <Tile key={option.id} name="rate" value={option.id} checked={rateId === option.id} onSelect={() => setRateId(option.id)}>
                      <span className="flex items-baseline justify-between gap-4 pr-6">
                        <span className="font-medium">{option.name}</span>
                        <span className="font-medium whitespace-nowrap tabular-nums">
                          {pence === 0 ? "Free" : formatPence(pence)}
                          {pence === 0 && option.pricePence > 0 ? (
                            <>
                              {" "}
                              <span className="sr-only">instead of</span>
                              <s className={`text-xs font-normal ${ui.shopMuted}`}>{formatPence(option.pricePence)}</s>
                            </>
                          ) : null}
                        </span>
                      </span>
                      {days ? <span className={`text-xs ${ui.shopMuted}`}>{days} once sent</span> : null}
                    </Tile>
                  );
                })}
              </TileGroup>
            </div>
          ) : (
            // No option set up, or none whose price list takes a parcel this size or weight.
            <p className={`mt-3 text-[0.93rem] ${ui.shopMuted}`}>
              We can&apos;t send this order just now: none of our ways of sending it takes it.{" "}
              <Link href="/contact" className="underline underline-offset-4">
                Get in touch
              </Link>{" "}
              and we&apos;ll find a way.
            </p>
          )}
          {madeToOrderNote ? <p className={`mt-4 text-sm ${ui.shopMuted}`}>{madeToOrderNote}</p> : null}
        </section>

        {state.notice ? (
          <p role="alert" className="rounded-md bg-nyoki-accent-beige px-5 py-3.5 text-[15px]">
            {state.notice}
          </p>
        ) : null}

        <div className="hidden flex-col gap-2 md:flex">
          <button
            type="submit"
            disabled={isPending || !canSend}
            className="h-[52px] rounded-full bg-nyoki-navy px-6 text-[15px] font-medium tracking-[0.12em] text-nyoki-beige uppercase transition-colors duration-150 hover:bg-nyoki-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nyoki-navy disabled:opacity-60 motion-reduce:transition-none"
          >
            {isPending ? "Saving…" : "Continue to payment"}
          </button>
          <p className={`text-center text-sm ${ui.shopMuted}`}>Nothing is charged yet. You&apos;ll see the total once more before paying.</p>
        </div>
      </form>

      <aside aria-label="Your order" className={`hidden flex-col gap-5 p-7 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:flex ${PANEL_SURFACE}`}>
        <h2 className={`text-xl font-medium tracking-tight ${ui.shopHeading}`}>Your order</h2>
        {summary}
      </aside>

      {/* On a phone the total and Continue are held at the foot of the screen. */}
      <div className={`sticky bottom-0 z-20 -mx-4 border-t px-4 pb-[env(safe-area-inset-bottom)] sm:-mx-6 sm:px-6 md:hidden ${ui.shopRule} ${ui.shopPage}`}>
        <div className="flex h-16 items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-xl leading-tight font-semibold tabular-nums">{formatPence(totals.totalPence)}</p>
            <p className={`truncate text-xs ${ui.shopMuted}`}>Includes {formatPence(totals.vatPence)} VAT</p>
          </div>
          <button
            type="submit"
            form={formId}
            disabled={isPending || !canSend}
            className="h-11 shrink-0 rounded-full bg-nyoki-navy px-6 text-sm font-medium tracking-[0.12em] text-nyoki-beige uppercase disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderSummary({
  lines,
  totals,
  rate,
  code,
  setCode,
  applyCode,
  error,
}: {
  lines: CheckoutLine[];
  totals: Totals;
  rate: DeliveryRate | null;
  code: AppliedCode | null;
  setCode: (code: AppliedCode | null) => void;
  applyCode: (code: string) => Promise<CodeResult>;
  /** From the server, when the code would not go through with the order. */
  error?: string;
}) {
  const codeId = useId();
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [applying, startApplying] = useTransition();

  const apply = () =>
    startApplying(async () => {
      const result = await applyCode(typed);
      if (result.ok) {
        setCode({ code: result.code, discountPence: result.discountPence, label: result.label });
        setTyped("");
        setMessage(null);
      } else {
        setMessage(result.message);
      }
    });

  const shown = message ?? (code ? null : error) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-4">
        {lines.map((line) => (
          <li key={line.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3.5">
            <div className="relative aspect-square rounded-lg bg-nyoki-soft-ash">
              {line.image ? <Image src={line.image} alt="" fill sizes="56px" className="rounded-lg object-cover" /> : null}
              {line.quantity > 1 ? (
                <span className="absolute -top-2 -right-2 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-nyoki-navy px-1.5 text-xs font-medium text-nyoki-beige ring-2 ring-nyoki-white">
                  <span className="sr-only">Quantity </span>
                  {line.quantity}
                </span>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-sm leading-snug font-medium text-nyoki-ink">{line.name}</p>
              {line.summary ? <p className={`mt-0.5 text-[12.5px] leading-snug ${ui.shopMuted}`}>{line.summary}</p> : null}
            </div>
            <p className="text-sm tabular-nums">{formatPence(line.totalPence)}</p>
          </li>
        ))}
      </ul>

      <div className={`flex flex-col gap-2 border-t pt-5 ${ui.shopRule}`}>
        {code ? (
          <>
            <p className="text-sm font-medium">Promo code</p>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-nyoki-beige px-3 py-2.5 text-sm ring-1 ring-nyoki-light-slate">
              <span className="font-semibold tracking-[0.08em]">{code.code}</span>
              <span className={ui.shopMuted}>
                {code.label} ·{" "}
                <button type="button" onClick={() => setCode(null)} className="underline underline-offset-4" aria-label={`Remove ${code.code}`}>
                  Remove
                </button>
              </span>
            </div>
          </>
        ) : (
          <>
            <label htmlFor={codeId} className="text-sm font-medium">
              Promo code
            </label>
            <div className="flex gap-2">
              <input
                id={codeId}
                type="text"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                onKeyDown={(event) => {
                  // Enter tries the code rather than sending the whole checkout.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    apply();
                  }
                }}
                autoCapitalize="characters"
                aria-invalid={shown ? "true" : undefined}
                className={`${INPUT} min-w-0 flex-1 py-2.5 uppercase`}
              />
              <button
                type="button"
                onClick={apply}
                disabled={applying || typed.trim() === ""}
                className="shrink-0 rounded-full px-5 text-sm font-medium tracking-[0.12em] text-nyoki-navy uppercase ring-[1.5px] ring-nyoki-navy ring-inset hover:bg-nyoki-accent-beige disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </>
        )}
        {shown ? <p className="text-xs text-red-700">{shown}</p> : null}
      </div>

      <dl className={`flex flex-col gap-2.5 border-t pt-5 tabular-nums ${ui.shopRule}`}>
        <div className="flex justify-between gap-4">
          <dt className={ui.shopMuted}>Subtotal</dt>
          <dd>{formatPence(totals.subtotalPence)}</dd>
        </div>
        {code ? (
          <div className="flex justify-between gap-4">
            <dt className={ui.shopMuted}>Promo code {code.code}</dt>
            <dd>−{formatPence(totals.discountPence)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className={ui.shopMuted}>Delivery{rate ? ` · ${rate.name}` : ""}</dt>
          <dd className={rate ? "" : ui.shopMuted}>{totals.deliveryPence === null ? "Choose below" : totals.deliveryPence === 0 ? "Free" : formatPence(totals.deliveryPence)}</dd>
        </div>
      </dl>

      <div className={`flex flex-col gap-0.5 border-t pt-5 ${ui.shopRule}`}>
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-medium text-nyoki-ink">Total</span>
          <span data-testid="checkout-total" className="text-2xl font-semibold text-nyoki-ink tabular-nums">
            {formatPence(totals.totalPence)}
          </span>
        </div>
        <p className={`text-right text-[13px] tabular-nums ${ui.shopMuted}`}>Includes {formatPence(totals.vatPence)} VAT</p>
      </div>
    </div>
  );
}
