import { ui } from "@/lib/brand/ui";
import Link from "next/link";

import { inputClass } from "@/components/admin/field";
import { db } from "@/lib/db";
import { parseProductFilter, productWhere } from "@/lib/products/filter";
import { formatPence } from "@/lib/money";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filter = parseProductFilter(await searchParams);
  const filtering = filter.q !== null || filter.status !== null;

  const [products, total] = await Promise.all([
    db.product.findMany({
      where: productWhere(filter),
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
    db.product.count(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Products</h1>

        <Link
          href="/admin/products/new"
          className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonPrimary}`}
        >
          Add a product
        </Link>
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label htmlFor="product-search" className="text-sm font-medium">
            Find
          </label>
          <input
            id="product-search"
            name="q"
            type="search"
            defaultValue={filter.q ?? ""}
            placeholder="Name or product code"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-status" className="text-sm font-medium">
            Status
          </label>
          <select id="product-status" name="status" defaultValue={filter.status ?? ""} className={inputClass}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <button type="submit" className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonSecondary}`}>
          Filter
        </button>
        {filtering ? (
          <Link href="/admin/products" className={`text-sm ${ui.link}`}>
            Clear
          </Link>
        ) : null}
      </form>

      <p className={`mt-4 text-sm ${ui.mutedOnPage}`}>
        {filtering ? `${products.length} of ${total} products` : `${total} products`}
      </p>

      {products.length === 0 && !filtering ? (
        <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.ruleOnPage}`}>
          <p className={`text-sm ${ui.mutedOnPage}`}>
            No products yet.
          </p>
          <Link
            href="/admin/products/new"
            className="mt-2 inline-block text-sm underline underline-offset-4"
          >
            Add the first one
          </Link>
        </div>
      ) : products.length === 0 ? (
        <p className={`mt-8 text-sm ${ui.mutedOnPage}`}>Nothing matches that. Try a shorter search, or clear the status.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-xl border-collapse text-sm">
            <thead>
              <tr className={`border-b text-left ${ui.tableHead}`}>
                <th className="py-2.5 pr-4 font-medium">Name</th>
                <th className="py-2.5 pr-4 font-medium">Status</th>
                <th className="py-2.5 pr-4 text-right font-medium">Price</th>
                <th className="py-2.5 pr-4 text-right font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className={`border-b ${ui.tableRow}`}
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.oneOfAKind ? (
                      <span className={`ml-2 text-xs ${ui.mutedOnPage}`}>
                        one of a kind
                      </span>
                    ) : null}
                  </td>
                  <td className={`py-3 pr-4 ${ui.mutedOnPage}`}>
                    {STATUS_LABEL[product.status] ?? product.status}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatPence(product.pricePence)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {product.madeToOrder ? "made to order" : product.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
