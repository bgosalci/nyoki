"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { ui } from "@/lib/brand/ui";
import type { DiscountCodeErrors, DiscountCodeInput } from "@/lib/discounts/validate";
import { formatPence } from "@/lib/money";

export interface DiscountCodeFormState {
  errors: DiscountCodeErrors;
}

export type DiscountCodeFormAction = (
  state: DiscountCodeFormState,
  formData: FormData,
) => Promise<DiscountCodeFormState>;

const EMPTY: DiscountCodeFormState = { errors: {} };

/** Pence as a plain editable amount: 2500 -> "25.00", null -> "". */
function pounds(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "";
  return formatPence(pence).replace("£", "").replaceAll(",", "");
}

function localDateTime(date: Date | null | undefined): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function DiscountCodeForm({
  action,
  code,
  initialState = EMPTY,
  submitLabel = "Save code",
}: {
  action: DiscountCodeFormAction;
  code?: DiscountCodeInput;
  initialState?: DiscountCodeFormState;
  submitLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-5">
        <Field
          label="Code"
          name="code"
          error={errors.code}
          hint="What the shopper types at checkout. Letters, numbers and dashes."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              defaultValue={code?.code ?? ""}
              placeholder="SPRING20"
              autoCapitalize="characters"
              className={`${inputClass} font-mono tracking-wider uppercase`}
            />
          )}
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Kind of discount</legend>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="type" value="PERCENTAGE" defaultChecked={(code?.type ?? "PERCENTAGE") === "PERCENTAGE"} />
              Percent off
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="type" value="FIXED_AMOUNT" defaultChecked={code?.type === "FIXED_AMOUNT"} />
              Pounds off
            </label>
          </div>
          {errors.type ? <p className="text-xs text-red-600 dark:text-red-400">{errors.type}</p> : null}
        </fieldset>

        <Field
          label="Amount"
          name="value"
          error={errors.value}
          hint="A whole percent (like 20), or pounds and pence (like 5.00)."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              inputMode="decimal"
              defaultValue={code ? (code.type === "PERCENTAGE" ? String(code.value) : pounds(code.value)) : ""}
              className={inputClass}
            />
          )}
        </Field>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts" name="startsAt" error={errors.startsAt}>
          {(props) => <input {...props} type="datetime-local" defaultValue={localDateTime(code?.startsAt)} className={inputClass} />}
        </Field>

        <Field label="Ends" name="endsAt" error={errors.endsAt} hint="Leave blank to run until you switch it off.">
          {(props) => <input {...props} type="datetime-local" defaultValue={localDateTime(code?.endsAt)} className={inputClass} />}
        </Field>

        <Field
          label="Minimum spend (£)"
          name="minSpend"
          error={errors.minSpend}
          hint="Leave blank for no minimum."
        >
          {(props) => (
            <input {...props} type="text" inputMode="decimal" defaultValue={pounds(code?.minSpendPence)} className={inputClass} />
          )}
        </Field>

        <Field
          label="How many times it can be used"
          name="usageLimit"
          error={errors.usageLimit}
          hint="Leave blank for no limit."
        >
          {(props) => (
            <input {...props} type="text" inputMode="numeric" defaultValue={code?.usageLimit ?? ""} className={inputClass} />
          )}
        </Field>

        <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
          <input type="checkbox" name="active" defaultChecked={code?.active ?? true} className="size-4" />
          Live — untick to switch the code off without deleting it
        </label>
      </section>

      <div className={`flex items-center gap-3 border-t pt-6 ${ui.ruleOnPage}`}>
        <button type="submit" disabled={isPending} className={`rounded-md px-4 py-2.5 text-sm font-medium transition-opacity ${ui.buttonPrimary}`}>
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link href="/admin/codes" className={`text-sm ${ui.link}`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
