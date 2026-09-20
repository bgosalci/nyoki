"use client";

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
  return (
    <div className="flex flex-col gap-8">
      <SaleForm action={updateSale.bind(null, id)} sale={sale} products={products} submitLabel="Save changes" />

      <form
        action={deleteSale.bind(null, id)}
        onSubmit={(event) => {
          if (!window.confirm("Delete this sale? Prices go back to normal straight away.")) {
            event.preventDefault();
          }
        }}
        className={`border-t pt-6 ${ui.ruleOnPage}`}
      >
        <button type="submit" className="text-sm text-red-700 underline underline-offset-4 dark:text-red-300">
          Delete this sale
        </button>
      </form>
    </div>
  );
}
