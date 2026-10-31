"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { Select } from "@/components/admin/select";
import { ui } from "@/lib/brand/ui";
import { PARCEL_SIZES, ROYAL_MAIL_PRICES_FROM, ROYAL_MAIL_SERVICES, SIZE_NAMES, type Band } from "@/lib/delivery/royal-mail";
import type { DeliveryRateErrors } from "@/lib/delivery/validate";
import { useActionForm } from "@/lib/forms/action-form";
import { formatPence } from "@/lib/money";

export interface DeliveryRateFormState {
  errors: DeliveryRateErrors;
}

export type DeliveryRateFormAction = (state: DeliveryRateFormState, formData: FormData) => Promise<DeliveryRateFormState>;

/** An option as the form starts from it: its price list always, whichever way it is priced. */
export interface DeliveryRateValues {
  name: string;
  pricePence: number;
  byWeight: boolean;
  bands: readonly Band[];
  freeOverPence: number | null;
  minDays: number | null;
  maxDays: number | null;
  active: boolean;
}

const EMPTY: DeliveryRateFormState = { errors: {} };

/** Pence as a plain editable amount: 395 -> "3.95", null -> "". */
function pounds(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "";
  return formatPence(pence).replace("£", "").replaceAll(",", "");
}

interface Row {
  key: number;
  size: string;
  upTo: string;
  price: string;
}

let nextKey = 0;
const row = (band?: Band): Row => ({
  key: nextKey++,
  size: band?.size ?? "",
  upTo: band ? String(band.upToGrams) : "",
  price: band ? pounds(band.pricePence) : "",
});
const rowsOf = (bands: readonly Band[]) => (bands.length > 0 ? bands.map(row) : [row()]);

/** A box of the form, by name, to fill in only while it is empty. */
function fillIfEmpty(form: HTMLFormElement | null, name: string, value: string) {
  const box = form?.elements.namedItem(name);
  if (box instanceof HTMLInputElement && box.value.trim() === "") box.value = value;
}

/**
 * One delivery option, added or changed in Settings › Delivery: priced from a
 * price list by size and weight, or at one price. Whichever is not in use
 * stays in the form, hidden and posted, so switching back finds it.
 */
export function DeliveryRateForm({
  action,
  rate,
  initialState = EMPTY,
  submitLabel = "Save option",
}: {
  action: DeliveryRateFormAction;
  rate?: DeliveryRateValues;
  initialState?: DeliveryRateFormState;
  submitLabel?: string;
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(action, initialState, (result) => Object.keys(result.errors).length > 0);
  const errors = state.errors;
  const id = useId();

  const [byWeight, setByWeight] = useState(rate?.byWeight ?? true);
  const [rows, setRows] = useState<Row[]>(() => rowsOf(rate?.bands ?? []));
  const [service, setService] = useState(ROYAL_MAIL_SERVICES[0].key);

  const change = (key: number, part: Partial<Row>) => setRows((current) => current.map((one) => (one.key === key ? { ...one, ...part } : one)));

  function fillIn() {
    const chosen = ROYAL_MAIL_SERVICES.find((one) => one.key === service);
    if (!chosen) return;
    setRows(chosen.bands.map(row));
    fillIfEmpty(formRef.current, "name", chosen.name);
    fillIfEmpty(formRef.current, "minDays", String(chosen.minDays));
    fillIfEmpty(formRef.current, "maxDays", String(chosen.maxDays));
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-8">
      <Field label="Name" name="name" error={errors.name} hint="As shoppers see it at checkout.">
        {(props) => <input {...props} type="text" defaultValue={rate?.name ?? ""} placeholder="Royal Mail Tracked 48" className={inputClass} />}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Priced</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            { value: "weight", title: "By size and weight", detail: "From a price list, for the parcel in the basket" },
            { value: "one", title: "One price", detail: "The same for every order" },
          ].map((option) => {
            const on = (option.value === "weight") === byWeight;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-2.5 text-sm ${on ? "border-nyoki-navy ring-1 ring-nyoki-navy dark:border-nyoki-beige dark:ring-nyoki-beige" : ui.ruleOnPage}`}
              >
                <input
                  type="radio"
                  name="priced"
                  value={option.value}
                  checked={on}
                  onChange={() => setByWeight(option.value === "weight")}
                  className={`mt-0.5 size-4 ${ui.checkbox}`}
                />
                <span>
                  <span className="block font-medium">{option.title}</span>
                  <span className={`text-xs ${ui.mutedOnPage}`}>{option.detail}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div hidden={!byWeight}>
        <section role="group" aria-labelledby={`${id}-list`} className={`flex flex-col gap-4 rounded-lg border p-4 sm:p-5 ${ui.ruleOnPage}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={`${id}-list`} className="text-base font-semibold">
              Price list
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Select aria-label="Royal Mail service" value={service} onChange={(event) => setService(event.target.value)} className={inputClass}>
                {ROYAL_MAIL_SERVICES.map((one) => (
                  <option key={one.key} value={one.key}>
                    {one.name.replace("Royal Mail ", "")}
                  </option>
                ))}
              </Select>
              <button type="button" onClick={fillIn} className={`rounded-md px-3 py-2 text-sm font-medium ${ui.buttonSecondary}`}>
                Fill in Royal Mail&rsquo;s prices
              </button>
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className={`border-b text-left text-xs tracking-wide uppercase ${ui.ruleOnPage} ${ui.mutedOnPage}`}>
                <th className="py-2 pr-3 font-semibold">Size</th>
                <th className="py-2 pr-3 font-semibold">Up to, in grams</th>
                <th className="py-2 pr-3 font-semibold">Price (£)</th>
                <th className="py-2">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((one, index) => (
                <tr key={one.key} className={`border-b ${ui.tableRow}`}>
                  <td className="py-2 pr-3">
                    <Select
                      name="bandSize"
                      aria-label={`Size, row ${index + 1}`}
                      value={one.size}
                      onChange={(event) => change(one.key, { size: event.target.value })}
                      className={`w-full ${inputClass}`}
                    >
                      <option value="">Choose</option>
                      {PARCEL_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {SIZE_NAMES[size]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      name="bandUpTo"
                      aria-label={`Up to, in grams, row ${index + 1}`}
                      type="text"
                      inputMode="numeric"
                      value={one.upTo}
                      onChange={(event) => change(one.key, { upTo: event.target.value })}
                      className={`w-28 tabular-nums ${inputClass}`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      name="bandPrice"
                      aria-label={`Price in pounds, row ${index + 1}`}
                      type="text"
                      inputMode="decimal"
                      value={one.price}
                      onChange={(event) => change(one.key, { price: event.target.value })}
                      className={`w-24 tabular-nums ${inputClass}`}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      aria-label={`Remove row ${index + 1}`}
                      onClick={() => setRows((current) => (current.length > 1 ? current.filter((other) => other.key !== one.key) : [row()]))}
                      className={`text-sm underline underline-offset-4 ${ui.mutedOnPage}`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {errors.bands ? <p className="text-sm text-red-600 dark:text-red-400">{errors.bands}</p> : null}

          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <button type="button" onClick={() => setRows((current) => [...current, row()])} className={`text-sm ${ui.link}`}>
              Add a row
            </button>
            <p className={`text-xs ${ui.mutedOnPage}`}>
              Royal Mail&rsquo;s online prices from {ROYAL_MAIL_PRICES_FROM}. A size with no price goes at the next size up.
            </p>
          </div>
        </section>
      </div>

      <div hidden={byWeight}>
        <Field label="Price (£)" name="price" error={errors.price}>
          {(props) => <input {...props} type="text" inputMode="decimal" defaultValue={pounds(rate?.pricePence)} placeholder="3.95" className={`max-w-xs ${inputClass}`} />}
        </Field>
      </div>

      <section className="grid gap-5 sm:grid-cols-3">
        <Field label="Free on orders over (£)" name="freeOver" error={errors.freeOver} hint="After any promo code. 0 makes it free on every order; leave it blank if it is never free.">
          {(props) => <input {...props} type="text" inputMode="decimal" defaultValue={pounds(rate?.freeOverPence)} placeholder="40.00" className={inputClass} />}
        </Field>

        <Field label="Shortest, in working days" name="minDays" error={errors.minDays} hint="Once it is sent.">
          {(props) => <input {...props} type="text" inputMode="numeric" defaultValue={rate?.minDays ?? ""} className={inputClass} />}
        </Field>

        <Field label="Longest, in working days" name="maxDays" error={errors.maxDays}>
          {(props) => <input {...props} type="text" inputMode="numeric" defaultValue={rate?.maxDays ?? ""} className={inputClass} />}
        </Field>

        <label className="flex items-center gap-2.5 text-sm sm:col-span-3">
          <input type="checkbox" name="active" defaultChecked={rate?.active ?? true} className={`size-4 ${ui.checkbox}`} />
          Offered at checkout — untick to stop offering it without deleting it
        </label>
      </section>

      <div className={`flex items-center gap-3 border-t pt-6 ${ui.ruleOnPage}`}>
        <button type="submit" disabled={isPending} className={`rounded-md px-4 py-2.5 text-sm font-medium transition-opacity ${ui.buttonPrimary}`}>
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link href="/admin/settings/delivery" className={`text-sm ${ui.link}`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
