"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { formatPence } from "@/lib/money";
import type { ProductErrors, ProductInput } from "@/lib/products/validate";

export interface ProductFormState {
  errors: ProductErrors;
}

export type ProductFormAction = (
  state: ProductFormState,
  formData: FormData,
) => Promise<ProductFormState>;

const EMPTY: ProductFormState = { errors: {} };

/** Pence to a plain editable string: 2400 -> "24.00", null -> "". */
function poundsValue(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "";
  return formatPence(pence).replace("£", "").replaceAll(",", "");
}

export function ProductForm({
  action,
  product,
  initialState = EMPTY,
  submitLabel = "Save product",
}: {
  action: ProductFormAction;
  product?: ProductInput;
  initialState?: ProductFormState;
  submitLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-5">
        <Field label="Name" name="name" error={errors.name}>
          {(props) => (
            <input
              {...props}
              type="text"
              defaultValue={product?.name ?? ""}
              className={inputClass}
            />
          )}
        </Field>

        <Field
          label="Web address"
          name="slug"
          error={errors.slug}
          hint="Leave blank to build one from the name."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              defaultValue={product?.slug ?? ""}
              placeholder="hand-thrown-mug"
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Description" name="description" error={errors.description}>
          {(props) => (
            <textarea
              {...props}
              rows={5}
              defaultValue={product?.description ?? ""}
              className={inputClass}
            />
          )}
        </Field>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <Field label="Price (£)" name="price" error={errors.price}>
          {(props) => (
            <input
              {...props}
              type="text"
              inputMode="decimal"
              defaultValue={poundsValue(product?.pricePence)}
              placeholder="24.00"
              className={inputClass}
            />
          )}
        </Field>

        <Field
          label="Was-price (£)"
          name="compareAtPrice"
          error={errors.compareAtPrice}
          hint="Shown struck through. Leave blank if there isn't one."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              inputMode="decimal"
              defaultValue={poundsValue(product?.compareAtPence)}
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Stock" name="stock" error={errors.stock}>
          {(props) => (
            <input
              {...props}
              type="text"
              inputMode="numeric"
              defaultValue={String(product?.stock ?? 0)}
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Product code" name="sku" error={errors.sku}>
          {(props) => (
            <input
              {...props}
              type="text"
              defaultValue={product?.sku ?? ""}
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Status" name="status" error={errors.status}>
          {(props) => (
            <select
              {...props}
              defaultValue={product?.status ?? "DRAFT"}
              className={inputClass}
            >
              <option value="DRAFT">Draft — not on the shop</option>
              <option value="ACTIVE">Active — on sale</option>
              <option value="ARCHIVED">Archived — hidden</option>
            </select>
          )}
        </Field>

        <Field
          label="Weight (grams)"
          name="weightGrams"
          error={errors.weightGrams}
          hint="Used to work out postage."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              inputMode="numeric"
              defaultValue={product?.weightGrams ?? ""}
              className={inputClass}
            />
          )}
        </Field>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-semibold">About the piece</h2>

        <Field label="Materials" name="materials" error={errors.materials}>
          {(props) => (
            <input
              {...props}
              type="text"
              defaultValue={product?.materials ?? ""}
              placeholder="Stoneware, matt glaze"
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Dimensions" name="dimensions" error={errors.dimensions}>
          {(props) => (
            <input
              {...props}
              type="text"
              defaultValue={product?.dimensions ?? ""}
              placeholder="9cm tall, 8cm across"
              className={inputClass}
            />
          )}
        </Field>

        <Field
          label="Care instructions"
          name="careInstructions"
          error={errors.careInstructions}
        >
          {(props) => (
            <textarea
              {...props}
              rows={3}
              defaultValue={product?.careInstructions ?? ""}
              className={inputClass}
            />
          )}
        </Field>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="oneOfAKind"
            defaultChecked={product?.oneOfAKind ?? false}
            className="size-4"
          />
          One of a kind — stock is always one
        </label>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="madeToOrder"
            defaultChecked={product?.madeToOrder ?? false}
            className="size-4"
          />
          Made to order
        </label>

        <Field
          label="Lead time (days)"
          name="leadTimeDays"
          error={errors.leadTimeDays}
          hint="How long a made-to-order piece takes."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              inputMode="numeric"
              defaultValue={product?.leadTimeDays ?? ""}
              className={inputClass}
            />
          )}
        </Field>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={product?.featured ?? false}
            className="size-4"
          />
          Feature on the front page
        </label>
      </section>

      <div className="flex items-center gap-3 border-t border-black/10 pt-6 dark:border-white/10">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>

        <Link
          href="/admin/products"
          className="text-sm text-black/60 underline underline-offset-4 dark:text-white/60"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
