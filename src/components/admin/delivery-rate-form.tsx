"use client";

import Link from "next/link";

import { Field, inputClass } from "@/components/admin/field";
import { ui } from "@/lib/brand/ui";
import type { DeliveryRateErrors, DeliveryRateInput } from "@/lib/delivery/validate";
import { useActionForm } from "@/lib/forms/action-form";
import { formatPence } from "@/lib/money";

export interface DeliveryRateFormState {
  errors: DeliveryRateErrors;
}

export type DeliveryRateFormAction = (state: DeliveryRateFormState, formData: FormData) => Promise<DeliveryRateFormState>;

const EMPTY: DeliveryRateFormState = { errors: {} };

/** Pence as a plain editable amount: 395 -> "3.95", null -> "". */
function pounds(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "";
  return formatPence(pence).replace("£", "").replaceAll(",", "");
}

/** One delivery option, added or changed in Settings › Delivery. */
export function DeliveryRateForm({
  action,
  rate,
  initialState = EMPTY,
  submitLabel = "Save option",
}: {
  action: DeliveryRateFormAction;
  rate?: DeliveryRateInput;
  initialState?: DeliveryRateFormState;
  submitLabel?: string;
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(action, initialState, (result) => Object.keys(result.errors).length > 0);
  const errors = state.errors;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-5">
        <Field label="Name" name="name" error={errors.name} hint="As shoppers see it at checkout.">
          {(props) => <input {...props} type="text" defaultValue={rate?.name ?? ""} placeholder="Royal Mail Tracked 48" className={inputClass} />}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Price (£)" name="price" error={errors.price}>
            {(props) => <input {...props} type="text" inputMode="decimal" defaultValue={pounds(rate?.pricePence)} placeholder="3.95" className={inputClass} />}
          </Field>

          <Field
            label="Free on orders over (£)"
            name="freeOver"
            error={errors.freeOver}
            hint="After any promo code. Leave blank if it is never free."
          >
            {(props) => <input {...props} type="text" inputMode="decimal" defaultValue={pounds(rate?.freeOverPence)} placeholder="40.00" className={inputClass} />}
          </Field>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <Field label="Shortest, in working days" name="minDays" error={errors.minDays} hint="Once it is sent.">
          {(props) => <input {...props} type="text" inputMode="numeric" defaultValue={rate?.minDays ?? ""} className={inputClass} />}
        </Field>

        <Field label="Longest, in working days" name="maxDays" error={errors.maxDays}>
          {(props) => <input {...props} type="text" inputMode="numeric" defaultValue={rate?.maxDays ?? ""} className={inputClass} />}
        </Field>

        <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
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
