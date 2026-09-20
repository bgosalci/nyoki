import { ui } from "@/lib/brand/ui";
import { ProductFilterForm } from "@/components/admin/product-filter-form";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { PINNED_BLOCK_CLASS, Th } from "@/components/admin/th";
import Link from "next/link";

import { db } from "@/lib/db";
import { CategoryPills } from "@/components/admin/category-pills";
import { subtreeIds } from "@/lib/products/category-pills";
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
  const filtering = filter.q !== null || filter.status !== null || filter.category !== null;

  const [categories, links] = await Promise.all([
    db.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, slug: true, name: true, parentId: true } }),
    db.categoryProduct.groupBy({ by: ["categoryId"], _count: { productId: true } }),
  ]);

  // A group's count is its whole subtree, since products link to the types beneath it.
  const direct = new Map(links.map((link) => [link.categoryId, link._count.productId]));
  const counts = Object.fromEntries(
    categories.map((category) => [category.id, subtreeIds(categories, category.id).reduce((n, id) => n + (direct.get(id) ?? 0), 0)]),
  );

  const selectedCategory = filter.category ? categories.find((c) => c.slug === filter.category) : undefined;
  const categoryIds = selectedCategory ? subtreeIds(categories, selectedCategory.id) : [];

  const [products, total] = await Promise.all([
    db.product.findMany({
      where: productWhere(filter, categoryIds),
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
    db.product.count(),
  ]);

  return (
    <>
      <PinnedHeight className={PINNED_BLOCK_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Products</h1>

        <Link
          href="/admin/products/new"
          className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonPrimary}`}
        >
          Add a product
        </Link>
      </div>

      <ProductFilterForm initialQ={filter.q ?? ""} initialStatus={filter.status ?? ""} category={filter.category ?? ""} />
      <CategoryPills categories={categories} counts={counts} selected={selectedCategory?.slug ?? null} q={filter.q ?? ""} status={filter.status ?? ""} />

      <p className={`mt-4 text-sm ${ui.mutedOnPage}`}>
        {filtering ? `${products.length} of ${total} products` : `${total} products`}
      </p>
      </PinnedHeight>

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
        <div className="mt-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th align="right">Price</Th>
                <Th align="right">Stock</Th>
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
