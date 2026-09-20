import { ProductCard } from "@/components/shop/product-card";
import type { CardProduct } from "@/lib/storefront/card";

export function ProductGrid({
  products,
  signedIn = false,
  savedIds,
  toggleFavourite,
}: {
  products: CardProduct[];
  signedIn?: boolean;
  /** Which of these are already saved; absent where saving is not on offer. */
  savedIds?: ReadonlySet<string>;
  toggleFavourite?: (productId: string) => Promise<void>;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.href}>
          <ProductCard
            product={product}
            signedIn={signedIn}
            saved={savedIds?.has(product.id) ?? false}
            toggleFavourite={toggleFavourite}
          />
        </li>
      ))}
    </ul>
  );
}
