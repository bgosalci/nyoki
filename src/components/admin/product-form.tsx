"use client";

import { ui } from "@/lib/brand/ui";
import Link from "next/link";

import { AlsoLikeField, type ChosenPiece } from "@/components/admin/also-like-field";
import { CategoryChooser } from "@/components/admin/category-chooser";
import type { PickerProduct } from "@/components/admin/product-picker";
import { Field, inputClass } from "@/components/admin/field";
import { TopSaveButton } from "@/components/admin/save-slot";
import { UnsavedChanges } from "@/components/admin/unsaved-changes";
import { formatPence } from "@/lib/money";
import type { ProductErrors, ProductInput } from "@/lib/products/validate";
import { useActionForm } from "@/lib/forms/action-form";

export interface ProductFormState {
  errors: ProductErrors;
}

export type ProductFormAction = (
  state: ProductFormState,
  formData: FormData,
) => Promise<ProductFormState>;

export interface ProductFormCategory {
  id: string;
  name: string;
  parentId: string | null;
}

const EMPTY: ProductFormState = { errors: {} };

export function ProductForm({
  action,
  product,
  pricing,
  categories = [],
  alsoLike,
  initialState = EMPTY,
  submitLabel = "Save product",
}: {
  action: ProductFormAction;
  product?: ProductInput;
  /**
   * The price as it stands, to show - never to edit. Absent for a product not
   * yet saved, which has no Price tab to point to.
   */
  pricing?: { productId: string; pricePence: number; compareAtPence: number | null };
  categories?: ProductFormCategory[];
  /** The pieces to suggest under "You may also like": what can be, and what is. */
  alsoLike?: { options: PickerProduct[]; automatic: PickerProduct[]; chosen: ChosenPiece[] };
  initialState?: ProductFormState;
  submitLabel?: string;
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(action, initialState, (result) => Object.keys(result.errors).length > 0);
  const errors = state.errors;

  return (
    <form id="product-details" ref={formRef} action={formAction} onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-8">
      {/* A new product is saved by leaving for its page, so only an edit reports a save. */}
      <UnsavedChanges formRef={formRef} saved={Object.keys(errors).length === 0 ? state : null} />
      <TopSaveButton form="product-details" pending={isPending} label={submitLabel} />

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
        {/* Shown, not edited. The price is set on the Price tab, beside what
            the piece costs to make, so there is one place it changes. */}
        <div role="group" aria-labelledby="product-price-label" className="flex flex-col gap-1.5 sm:col-span-2">
          <p id="product-price-label" className="text-sm font-medium">
            Price
          </p>
          {pricing === undefined ? (
            <p className={`text-sm ${ui.mutedOnPage}`}>
              Set on its Price tab once the product is saved. It stays off the shop until then.
            </p>
          ) : (
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              {pricing.pricePence > 0 ? (
                <span className="text-base font-medium tabular-nums">{formatPence(pricing.pricePence)}</span>
              ) : (
                <span className="font-medium">Not priced yet</span>
              )}
              {pricing.compareAtPence !== null ? (
                <span className={`tabular-nums ${ui.mutedOnPage}`}>was {formatPence(pricing.compareAtPence)}</span>
              ) : null}
              <Link href={`/admin/products/${pricing.productId}/price`} className={ui.link}>
                Change it on the Price tab
              </Link>
            </p>
          )}
        </div>

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
            className={`size-4 ${ui.checkbox}`}
          />
          One of a kind — stock is always one
        </label>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="madeToOrder"
            defaultChecked={product?.madeToOrder ?? false}
            className={`size-4 ${ui.checkbox}`}
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
            className={`size-4 ${ui.checkbox}`}
          />
          Feature on the front page
        </label>
      </section>

      <CategoryChooser categories={categories} chosen={product?.categoryIds ?? []} error={errors.categoryIds} />

      {alsoLike ? <AlsoLikeField options={alsoLike.options} automatic={alsoLike.automatic} chosen={alsoLike.chosen} error={errors.alsoLikeIds} /> : null}

      <div className={`flex items-center gap-3 border-t pt-6 ${ui.ruleOnPage}`}>
        <button
          type="submit"
          disabled={isPending}
          className={`rounded-md px-4 py-2.5 text-sm font-medium transition-opacity ${ui.buttonPrimary}`}
        >
          {isPending ? "Saving…" : submitLabel}
        </button>

        <Link
          href="/admin/products"
          className={`text-sm ${ui.link}`}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
