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
        A CSV, JSON or XML file. Products are matched by their web address; one with a new address, or none, is added as
        a draft. Fields left out of the file change nothing. Photos stay as they are - add them on each product.
      </p>
      <div className="mt-6">
        <ImportProducts check={checkImport} apply={applyImport} />
      </div>
    </>
  );
}
