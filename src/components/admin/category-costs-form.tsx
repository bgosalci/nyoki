"use client";

import { useActionState, useRef, useState } from "react";

import { CostLinesTable } from "@/components/admin/cost-lines-table";
import { UnsavedChanges } from "@/components/admin/unsaved-changes";
import { ui } from "@/lib/brand/ui";
import type { EntryLine } from "@/lib/costing/import";
import { toCostRow, type CostRow } from "@/lib/costing/rows";

export interface CategoryCostsState {
  error?: string;
  saved?: boolean;
}

export type CategoryCostsAction = (state: CategoryCostsState, formData: FormData) => Promise<CategoryCostsState>;

/**
 * A category's usual costs: the lines most of its pieces share, which a piece
 * not yet costed can start from on its Price tab.
 */
export function CategoryCostsForm({
  categoryName,
  lines,
  action,
}: {
  categoryName: string;
  lines: EntryLine[];
  action: CategoryCostsAction;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [rows, setRows] = useState<CostRow[]>(() => lines.map(toCostRow));
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex max-w-2xl flex-col">
      <UnsavedChanges formRef={formRef} saved={state.saved ? state : null} />

      <h2 className="text-base font-semibold">Usual costs</h2>
      <p className={`mt-1 max-w-prose text-sm ${ui.mutedOnPage}`}>
        Pieces in {categoryName}, and in the types beneath it, that are not costed yet can start from these on their
        Price tab, to be checked and saved. They are copied in, so changing them here changes nothing already priced.
      </p>

      {rows.length === 0 ? (
        <p className={`mt-4 text-sm ${ui.mutedOnPage}`}>No usual costs yet. Add a line for each thing most pieces here use.</p>
      ) : null}

      <CostLinesTable rows={rows} onChange={setRows} error={state.error} />

      {state.saved ? (
        <p role="status" className={`mt-4 rounded-md border px-3 py-2 text-sm ${ui.card} ${ui.rule}`}>
          Saved. Pieces not yet costed start from these now.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className={`mt-6 self-start rounded-md px-4 py-2.5 text-sm font-medium ${ui.buttonPrimary}`}
      >
        {isPending ? "Saving…" : "Save usual costs"}
      </button>
    </form>
  );
}
