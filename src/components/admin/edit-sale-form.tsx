"use client";

import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ui } from "@/lib/brand/ui";
import { SaleForm, type SaleFormProduct } from "@/components/admin/sale-form";
import { deleteSale, updateSale } from "@/app/admin/(protected)/sales/actions";
import type { SaleInput } from "@/lib/sales/validate";

/** Binds the sale id to the actions; see EditProductForm for why this is a client component. */
export function EditSaleForm({
  id,
  sale,
  products,
}: {
  id: string;
  sale: SaleInput;
  products: SaleFormProduct[];
}) {
  const [confirming, setConfirming] = useState(false);
  const deleteForm = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-8">
      <SaleForm action={updateSale.bind(null, id)} sale={sale} products={products} submitLabel="Save changes" />

      <form ref={deleteForm} action={deleteSale.bind(null, id)} className={`border-t pt-6 ${ui.ruleOnPage}`}>
        <button type="button" onClick={() => setConfirming(true)} className="text-sm text-red-700 underline underline-offset-4 dark:text-red-300">
          Delete this sale
        </button>
      </form>
      <ConfirmDialog
        open={confirming}
        title="Delete this sale?"
        description="Prices go back to normal straight away. The products themselves are untouched."
        confirmLabel="Delete sale"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          deleteForm.current?.requestSubmit();
        }}
      />
    </div>
  );
}
