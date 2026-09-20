import type { Metadata } from "next";
import Link from "next/link";

import { toggleFavourite } from "@/app/(shop)/account/actions";
import { ProductGrid } from "@/components/shop/product-grid";
import { requireCustomer } from "@/lib/account/dal";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { CARD_SELECT, toCards } from "@/lib/storefront/queries";

export const metadata: Metadata = {
  title: "Saved pieces",
  robots: { index: false, follow: false },
};

export default async function FavouritesPage() {
  const shopper = await requireCustomer();

  const saved = await db.favourite.findMany({
    where: { customerId: shopper.id },
    orderBy: { createdAt: "desc" },
    select: { product: { select: CARD_SELECT } },
  });

  // A piece saved and later taken off the shop is no longer something to buy,
  // so it drops off the list rather than leading to a page that is not there.
  const products = toCards(saved.map((row) => row.product).filter((product) => product.status === "ACTIVE"));

  return (
    <div className="mx-auto max-w-shop px-4 py-12 sm:px-6">
      <Link href="/account" className={`text-sm underline underline-offset-4 ${ui.shopMuted}`}>
        Back to your account
      </Link>

      <h1 className={`mt-4 text-3xl tracking-tight ${ui.shopHeading}`}>Saved pieces</h1>

      {products.length === 0 ? (
        <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.shopRule}`}>
          <p className={`text-sm ${ui.shopMuted}`}>
            Nothing saved yet. The heart on any piece keeps it here for later.
          </p>
          <Link href="/shop" className="mt-3 inline-block text-sm underline underline-offset-4">
            Have a look around
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <ProductGrid
            products={products}
            signedIn
            savedIds={new Set(products.map((product) => product.id))}
            toggleFavourite={toggleFavourite}
          />
        </div>
      )}
    </div>
  );
}
