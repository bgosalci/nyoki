"use client";

import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
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
  const [confirming, setConfirming] = useState(false);
  const deleteForm = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-8">
      <CategoryForm
        action={updateCategory.bind(null, id)}
        category={category}
        categories={categories}
        excludeId={id}
        submitLabel="Save changes"
      />

      <form ref={deleteForm} action={deleteCategory.bind(null, id)} className={`border-t pt-6 ${ui.ruleOnPage}`}>
        <button type="button" onClick={() => setConfirming(true)} className="text-sm text-red-700 underline underline-offset-4 dark:text-red-300">
          Delete this category
        </button>
      </form>
      <ConfirmDialog
        open={confirming}
        title="Delete this category?"
        description="Its sub-categories move to the top level and its products are unlinked, not deleted."
        confirmLabel="Delete category"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          deleteForm.current?.requestSubmit();
        }}
      />
    </div>
  );
}
