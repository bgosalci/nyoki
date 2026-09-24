import { applyImport, checkImport } from "@/app/admin/(protected)/products/import/actions";
import { BackLink } from "@/components/admin/back-link";
import { ImportProducts } from "@/components/admin/import-products";
import { ui } from "@/lib/brand/ui";

export default function ImportProductsPage() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/products">Back to all products</BackLink>
        <h1 className="text-xl font-semibold tracking-tight">Import products</h1>
      </div>
      <p className={`mt-2 max-w-prose text-sm ${ui.mutedOnPage}`}>
        Rows are matched to products by their web address; a row with a new one, or none, adds a product as a draft.
        Columns left out of the file change nothing. Photos stay as they are - add them on each product.
      </p>
      <div className="mt-6">
        <ImportProducts check={checkImport} apply={applyImport} />
      </div>
    </>
  );
}
