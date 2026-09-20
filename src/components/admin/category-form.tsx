"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { descendantIds } from "@/lib/categories/validate";
import type { CategoryErrors, CategoryInput } from "@/lib/categories/validate";

export interface CategoryFormState {
  errors: CategoryErrors;
}

export type CategoryFormAction = (
  state: CategoryFormState,
  formData: FormData,
) => Promise<CategoryFormState>;

export interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
}

const EMPTY: CategoryFormState = { errors: {} };

export function CategoryForm({
  action,
  categories,
  category,
  excludeId,
  initialState = EMPTY,
  submitLabel = "Save category",
}: {
  action: CategoryFormAction;
  categories: CategoryOption[];
  category?: CategoryInput;
  /** When editing: the category itself, so it and its descendants are not offered as parents. */
  excludeId?: string;
  initialState?: CategoryFormState;
  submitLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors;

  // A category cannot sit inside itself or anything beneath it. The server
  // checks this too; hiding the options just stops the mistake being offered.
  const excluded = excludeId ? new Set([excludeId, ...descendantIds(categories, excludeId)]) : new Set<string>();
  const parentOptions = categories.filter((option) => !excluded.has(option.id));

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      <Field label="Name" name="name" error={errors.name}>
        {(props) => (
          <input {...props} type="text" defaultValue={category?.name ?? ""} className={inputClass} />
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
            defaultValue={category?.slug ?? ""}
            placeholder="mugs"
            className={inputClass}
          />
        )}
      </Field>

      <Field label="Description" name="description" error={errors.description}>
        {(props) => (
          <textarea {...props} rows={3} defaultValue={category?.description ?? ""} className={inputClass} />
        )}
      </Field>

      <Field
        label="Parent category"
        name="parentId"
        error={errors.parentId}
        hint="Leave at top level unless this belongs inside another category."
      >
        {(props) => (
          <select {...props} defaultValue={category?.parentId ?? ""} className={inputClass}>
            <option value="">Top level</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="flex items-center gap-3 border-t border-black/10 pt-6 dark:border-white/10">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link href="/admin/categories" className="text-sm text-black/60 underline underline-offset-4 dark:text-white/60">
          Cancel
        </Link>
      </div>
    </form>
  );
}
