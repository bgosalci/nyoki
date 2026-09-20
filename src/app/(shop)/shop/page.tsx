import type { Metadata } from "next";

import { CategoryTiles } from "@/components/shop/category-tiles";
import { toggleFavourite } from "@/app/(shop)/account/actions";
import { ProductGrid } from "@/components/shop/product-grid";
import { currentCustomer } from "@/lib/account/dal";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { activeProducts, savedProductIds, tileProducts, toCards } from "@/lib/storefront/queries";
import { categoryTiles } from "@/lib/storefront/tiles";

export const metadata: Metadata = {
  title: "Everything",
  description:
    "Every piece in the shop: cards, clothes and little things for the home, crocheted, stitched and printed by hand in the UK.",
};

export default async function ShopAllPage() {
  const shopper = await currentCustomer();

  const [products, categories, forTiles, savedIds] = await Promise.all([
    activeProducts(),
    db.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, parentId: true },
    }),
    tileProducts(),
    savedProductIds(shopper?.id ?? null),
  ]);

  const departments = categoryTiles(categories, null, forTiles);

  return (
    <>
      <section className={ui.shopBandQuiet}>
        <div className="mx-auto max-w-shop px-4 py-10 sm:px-6 md:py-14">
          <h1 className={`text-3xl tracking-tight md:text-4xl ${ui.shopHeading}`}>Everything</h1>
          <p className="mt-4 max-w-prose leading-relaxed">
            Cards, clothes and little things for the home - crocheted, stitched and printed by hand in the UK, in
            small enough numbers that no two come out quite alike.
          </p>
          <p className={`mt-4 text-sm ${ui.shopMuted}`}>
            {products.length} {products.length === 1 ? "piece" : "pieces"} to choose from
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-shop flex-col gap-14 px-4 py-12 sm:px-6">
        <CategoryTiles heading="Start with a department" tiles={departments} />

        <section>
          <h2 className={`text-2xl tracking-tight ${ui.shopHeading}`}>Everything, newest first</h2>
          <div className="mt-6">
            <ProductGrid
              products={toCards(products)}
              signedIn={shopper !== null}
              savedIds={savedIds}
              toggleFavourite={toggleFavourite}
            />
          </div>
        </section>
      </div>
    </>
  );
}
