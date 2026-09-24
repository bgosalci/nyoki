"use client";

import { ui } from "@/lib/brand/ui";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { formatPence } from "@/lib/money";
import type { SaleErrors, SaleInput } from "@/lib/sales/validate";
import { useActionForm } from "@/lib/forms/action-form";

export interface SaleFormState {
  errors: SaleErrors;
}

export type SaleFormAction = (
  state: SaleFormState,
  formData: FormData,
) => Promise<SaleFormState>;

export interface SaleFormProduct {
  id: string;
  name: string;
  pricePence: number;
}

const EMPTY: SaleFormState = { errors: {} };

/** A Date as the value a datetime-local input expects, in local time. */
function localDateTime(date: Date | null | undefined): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function amountValue(sale: SaleInput | undefined): string {
  if (!sale) return "";
  if (sale.type === "PERCENTAGE") return String(sale.value);
  return formatPence(sale.value).replace("£", "").replaceAll(",", "");
}

/**
 * The sale form, including the product picker that makes a batch sale a batch.
 *
 * The picker is controlled state: every product is always rendered so a
 * selection survives being filtered out of view, and only the non-matching
 * rows are hidden. A hidden checked box still submits.
 */
export function SaleForm({
  action,
  products,
  sale,
  initialState = EMPTY,
  submitLabel = "Save sale",
}: {
  action: SaleFormAction;
  products: SaleFormProduct[];
  sale?: SaleInput;
  initialState?: SaleFormState;
  submitLabel?: string;
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(action, initialState, (result) => Object.keys(result.errors).length > 0);
  const errors = state.errors;

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(sale?.productIds ?? []),
  );
  const [query, setQuery] = useState("");

  const visibleIds = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return new Set(products.map((p) => p.id));
    return new Set(
      products.filter((p) => p.name.toLowerCase().includes(needle)).map((p) => p.id),
    );
  }, [products, query]);

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-5">
        <Field label="Name" name="name" error={errors.name} hint="Only you see this.">
          {(props) => (
            <input {...props} type="text" defaultValue={sale?.name ?? ""} className={inputClass} />
          )}
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Kind of discount</legend>
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                value="PERCENTAGE"
                defaultChecked={(sale?.type ?? "PERCENTAGE") === "PERCENTAGE"}
              />
              Percent off
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                value="FIXED_AMOUNT"
                defaultChecked={sale?.type === "FIXED_AMOUNT"}
              />
              Pounds off
            </label>
          </div>
          {errors.type ? (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.type}</p>
          ) : null}
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
              defaultValue={amountValue(sale)}
              className={inputClass}
            />
          )}
        </Field>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts" name="startsAt" error={errors.startsAt}>
          {(props) => (
            <input
              {...props}
              type="datetime-local"
              defaultValue={localDateTime(sale?.startsAt)}
              className={inputClass}
            />
          )}
        </Field>

        <Field
          label="Ends"
          name="endsAt"
          error={errors.endsAt}
          hint="Leave blank to run until you switch it off."
        >
          {(props) => (
            <input
              {...props}
              type="datetime-local"
              defaultValue={localDateTime(sale?.endsAt)}
              className={inputClass}
            />
          )}
        </Field>

        <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="active"
            defaultChecked={sale?.active ?? true}
            className={`size-4 ${ui.checkbox}`}
          />
          Live — untick to pause the sale without deleting it
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold">Products in this sale</h2>
          <p className={`text-xs ${ui.mutedOnPage}`}>
            {selected.size} of {products.length} selected
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="sale-product-search" className="sr-only">
            Find products
          </label>
          <input
            id="sale-product-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find products…"
            className={`${inputClass} min-w-48 flex-1`}
          />
          <button
            type="button"
            onClick={() => setSelected(new Set(products.map((p) => p.id)))}
            className={`rounded-md px-3 py-2 text-xs ${ui.buttonSecondary}`}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className={`rounded-md px-3 py-2 text-xs ${ui.buttonSecondary}`}
          >
            Clear
          </button>
        </div>

        {errors.productIds ? (
          <p className="text-xs text-red-600 dark:text-red-400">{errors.productIds}</p>
        ) : null}

        <ul className={`max-h-80 divide-y divide-nyoki-accent-beige overflow-y-auto rounded-md border dark:divide-nyoki-navy ${ui.panel} ${ui.rule}`}>
          {products.map((product) => (
            <li key={product.id} hidden={!visibleIds.has(product.id)}>
              <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-nyoki-beige dark:hover:bg-nyoki-ink">
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    name="productIds"
                    value={product.id}
                    checked={selected.has(product.id)}
                    onChange={(event) => toggle(product.id, event.target.checked)}
                    className={`size-4 ${ui.checkbox}`}
                  />
                  {product.name}
                </span>
                <span className={`tabular-nums ${ui.mutedOnPanel}`}>
                  {formatPence(product.pricePence)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className={`flex items-center gap-3 border-t pt-6 ${ui.ruleOnPage}`}>
        <button
          type="submit"
          disabled={isPending}
          className={`rounded-md px-4 py-2.5 text-sm font-medium transition-opacity ${ui.buttonPrimary}`}
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin/sales"
          className={`text-sm ${ui.link}`}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
