import Link from "next/link";

import { db } from "@/lib/db";
import { formatPence } from "@/lib/money";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export default async function ProductsPage() {
  const products = await db.product.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Products</h1>

        <Link
          href="/admin/products/new"
          className="rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-neutral-900"
        >
          Add a product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-black/15 p-10 text-center dark:border-white/15">
          <p className="text-sm text-black/60 dark:text-white/60">
            No products yet.
          </p>
          <Link
            href="/admin/products/new"
            className="mt-2 inline-block text-sm underline underline-offset-4"
          >
            Add the first one
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/10">
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
                  className="border-b border-black/5 dark:border-white/5"
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.oneOfAKind ? (
                      <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                        one of a kind
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-black/70 dark:text-white/70">
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
