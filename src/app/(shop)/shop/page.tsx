import type { Metadata } from "next";

import { ProductGrid } from "@/components/shop/product-grid";
import { ui } from "@/lib/brand/ui";
import { activeProducts, toCards } from "@/lib/storefront/queries";

export const metadata: Metadata = { title: "Everything" };

export default async function ShopAllPage() {
  const products = await activeProducts();

  return (
    <div className="mx-auto max-w-shop px-4 py-12 sm:px-6">
      <h1 className={`text-3xl tracking-tight ${ui.shopHeading}`}>Everything</h1>

      <p className={`mt-2 text-sm ${ui.shopMuted}`}>{products.length} pieces</p>
      <div className="mt-10">
        <ProductGrid products={toCards(products)} />
      </div>
    </div>
  );
}
