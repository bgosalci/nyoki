"use client";

import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DiscountCodeForm } from "@/components/admin/discount-code-form";
import { deleteDiscountCode, updateDiscountCode } from "@/app/admin/(protected)/codes/actions";
import { ui } from "@/lib/brand/ui";
import type { DiscountCodeInput } from "@/lib/discounts/validate";

/** Binds the code's id to its actions; see EditProductForm for why this is a client component. */
export function EditDiscountCodeForm({ id, code }: { id: string; code: DiscountCodeInput }) {
  const [confirming, setConfirming] = useState(false);
  const deleteForm = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-8">
      <DiscountCodeForm action={updateDiscountCode.bind(null, id)} code={code} submitLabel="Save changes" />

      <form ref={deleteForm} action={deleteDiscountCode.bind(null, id)} className={`border-t pt-6 ${ui.ruleOnPage}`}>
        <button type="button" onClick={() => setConfirming(true)} className="text-sm text-red-700 underline underline-offset-4 dark:text-red-300">
          Delete this code
        </button>
      </form>

      <ConfirmDialog
        open={confirming}
        title={`Delete ${code.code}?`}
        description="Anyone typing it at checkout will be told it is not available. Orders that already used it keep their discount."
        confirmLabel="Delete code"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          deleteForm.current?.requestSubmit();
        }}
      />
    </div>
  );
}
