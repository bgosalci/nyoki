import type { Metadata } from "next";

import { ProductGrid } from "@/components/shop/product-grid";
import { inputClass } from "@/components/admin/field";
import { ui } from "@/lib/brand/ui";
import { parseProductFilter, productWhere } from "@/lib/products/filter";
import { activeProducts, toCards } from "@/lib/storefront/queries";

export const metadata: Metadata = { title: "Everything" };

export default async function ShopAllPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Only the search term applies out here; status and category are the
  // admin's concerns, and the shop shows ACTIVE products only.
  const filter = { ...parseProductFilter(await searchParams), status: null, category: null };
  const products = await activeProducts(productWhere(filter));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className={`text-3xl tracking-tight ${ui.shopHeading}`}>Everything</h1>

      <form method="get" className="mt-6 flex max-w-md items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="shop-search" className={`text-sm font-medium ${ui.shopHeading}`}>
            Search
          </label>
          <input id="shop-search" name="q" type="search" defaultValue={filter.q ?? ""} placeholder="Cards, hairbands, a name…" className={inputClass} />
        </div>
        <button type="submit" className={`px-5 py-2 text-xs tracking-[0.14em] uppercase ${ui.shopButton}`}>
          Search
        </button>
      </form>

      <p className={`mt-6 text-sm ${ui.shopMuted}`}>
        {filter.q ? `${products.length} pieces matching “${filter.q}”` : `${products.length} pieces`}
      </p>
      <div className="mt-10">
        <ProductGrid products={toCards(products)} />
      </div>
    </div>
  );
}
