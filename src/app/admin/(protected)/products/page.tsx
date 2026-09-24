import { ui } from "@/lib/brand/ui";
import { ProductFilterForm } from "@/components/admin/product-filter-form";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { ProductTable } from "@/components/admin/product-table";
import { deleteProducts, repriceProducts, setProductsStatus } from "@/app/admin/(protected)/products/actions";
import { PINNED_BLOCK_CLASS } from "@/components/admin/th";
import Link from "next/link";

import { db } from "@/lib/db";
import { CategoryPills } from "@/components/admin/category-pills";
import { ExportButton } from "@/components/admin/export-button";
import { subtreeIds } from "@/lib/products/category-pills";
import { PRODUCT_LIST_ORDER, parseProductFilter, productWhere } from "@/lib/products/filter";

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
      orderBy: PRODUCT_LIST_ORDER,
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
    db.product.count(),
  ]);

  const HEADER = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Products</h1>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButton q={filter.q ?? ""} status={filter.status ?? ""} category={filter.category ?? ""} count={filtering ? products.length : total} />
          <Link
            href="/admin/products/new"
            className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonPrimary}`}
          >
            Add a product
          </Link>
        </div>
      </div>

      <ProductFilterForm initialQ={filter.q ?? ""} initialStatus={filter.status ?? ""} category={filter.category ?? ""} />
      <CategoryPills categories={categories} counts={counts} selected={selectedCategory?.slug ?? null} q={filter.q ?? ""} status={filter.status ?? ""} />

      <p className={`mt-4 text-sm ${ui.mutedOnPage}`}>
        {filtering ? `${products.length} of ${total} products` : `${total} products`}
      </p>
    </>
  );

  return (
    <>
      {products.length === 0 ? (
        <>
          {/* No rows, so nothing to select: the header pins on its own. */}
          <PinnedHeight className={PINNED_BLOCK_CLASS}>{HEADER}</PinnedHeight>

          {filtering ? (
            <p className={`mt-8 text-sm ${ui.mutedOnPage}`}>
              Nothing matches that. Try a shorter search, or clear the status.
            </p>
          ) : (
            <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.ruleOnPage}`}>
              <p className={`text-sm ${ui.mutedOnPage}`}>No products yet.</p>
              <Link href="/admin/products/new" className="mt-2 inline-block text-sm underline underline-offset-4">
                Add the first one
              </Link>
            </div>
          )}
        </>
      ) : (
        <ProductTable
          header={HEADER}
          rows={products.map((product) => ({
            id: product.id,
            name: product.name,
            status: product.status,
            pricePence: product.pricePence,
            stock: product.stock,
            madeToOrder: product.madeToOrder,
            oneOfAKind: product.oneOfAKind,
            image: product.images[0] ?? null,
          }))}
          setStatus={setProductsStatus}
          remove={deleteProducts}
          reprice={repriceProducts}
        />
      )}
    </>
  );
}
