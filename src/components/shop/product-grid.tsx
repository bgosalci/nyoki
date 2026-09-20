import { ProductCard } from "@/components/shop/product-card";
import type { CardProduct } from "@/lib/storefront/card";

export function ProductGrid({ products }: { products: CardProduct[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.href}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
