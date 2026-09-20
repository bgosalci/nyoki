"use client";

import { ui } from "@/lib/brand/ui";
import { CategoryForm, type CategoryOption } from "@/components/admin/category-form";
import { deleteCategory, updateCategory } from "@/app/admin/(protected)/categories/actions";
import type { CategoryInput } from "@/lib/categories/validate";

/** Binds the category id to the actions; see EditProductForm for why this is a client component. */
export function EditCategoryForm({
  id,
  category,
  categories,
}: {
  id: string;
  category: CategoryInput;
  categories: CategoryOption[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <CategoryForm
        action={updateCategory.bind(null, id)}
        category={category}
        categories={categories}
        excludeId={id}
        submitLabel="Save changes"
      />

      <form
        action={deleteCategory.bind(null, id)}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Delete this category? Its sub-categories move to the top level and its products are unlinked, not deleted.",
            )
          ) {
            event.preventDefault();
          }
        }}
        className={`border-t pt-6 ${ui.ruleOnPage}`}
      >
        <button type="submit" className="text-sm text-red-700 underline underline-offset-4 dark:text-red-300">
          Delete this category
        </button>
      </form>
    </div>
  );
}
