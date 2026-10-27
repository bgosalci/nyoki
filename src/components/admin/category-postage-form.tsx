"use client";

import { useState } from "react";

import { PostageFields, postageText } from "@/components/admin/postage-fields";
import { UnsavedChanges } from "@/components/admin/unsaved-changes";
import { ui } from "@/lib/brand/ui";
import type { PostageFacts } from "@/lib/delivery/parcel";
import { useActionForm } from "@/lib/forms/action-form";

export interface CategoryPostageState {
  errors: Partial<Record<string, string>>;
  saved?: boolean;
}

const NAMES = { grams: "usualGrams", size: "usualParcelSize", mm: "usualThicknessMm" };

/**
 * A category's usual postage: what its pieces, and those in the types beneath
 * it, go by when they have no postage of their own. Read live rather than
 * copied, so one change here reprices every piece using it - unlike its
 * usual costs, which are a starting point to be checked.
 */
export function CategoryPostageForm({
  categoryName,
  usual,
  users,
  weighed,
  action,
  initialState = { errors: {} },
}: {
  categoryName: string;
  usual: PostageFacts;
  /** Pieces that go by this usual: no weight of their own, and nothing nearer. */
  users: number;
  /** Pieces it would cover that have a weight of their own. */
  weighed: number;
  action: (state: CategoryPostageState, formData: FormData) => Promise<CategoryPostageState>;
  initialState?: CategoryPostageState;
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(action, initialState, (result) => Object.keys(result.errors).length > 0);
  const [value, setValue] = useState(() => postageText(usual));
  const set = usual.grams !== null || usual.size !== null || usual.mm !== null;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <UnsavedChanges formRef={formRef} saved={state.saved ? state : null} />

      <div>
        <h2 className="text-base font-semibold">Usual postage</h2>
        <p className={`mt-1 max-w-prose text-sm ${ui.mutedOnPage}`}>
          Pieces in {categoryName}, and in the types beneath it, go by these when they have none of their own. They are not copied: change them, and every
          piece using them follows.
        </p>
      </div>

      <PostageFields names={NAMES} value={value} onChange={setValue} errors={state.errors} blank={{ grams: "", size: "None set", mm: "" }} />

      {set ? (
        <p className="text-sm">
          Used by {users} {users === 1 ? "piece" : "pieces"}.{" "}
          {weighed > 0 ? `${weighed} ${weighed === 1 ? "has a weight of its own" : "have a weight of their own"}.` : null}
        </p>
      ) : null}

      {state.saved && !isPending ? (
        <p role="status" className={`rounded-md border px-3 py-2 text-sm ${ui.card} ${ui.rule}`}>
          Saved. Pieces using it are priced by it now.
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className={`self-start rounded-md px-4 py-2.5 text-sm font-medium ${ui.buttonPrimary}`}>
        {isPending ? "Saving…" : "Save usual postage"}
      </button>
    </form>
  );
}
