import Link from "next/link";
import { notFound } from "next/navigation";

import { EditProductForm } from "@/components/admin/edit-product-form";
import { db } from "@/lib/db";
import type { ProductInput } from "@/lib/products/validate";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();

  // Narrow the database row to exactly what the form needs, so a column added
  // later does not silently become a hidden form field.
  const initial: ProductInput = {
    name: product.name,
    slug: product.slug,
    description: product.description,
    status: product.status,
    pricePence: product.pricePence,
    compareAtPence: product.compareAtPence,
    sku: product.sku,
    stock: product.stock,
    weightGrams: product.weightGrams,
    featured: product.featured,
    dimensions: product.dimensions,
    materials: product.materials,
    careInstructions: product.careInstructions,
    oneOfAKind: product.oneOfAKind,
    madeToOrder: product.madeToOrder,
    leadTimeDays: product.leadTimeDays,
  };

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
        <Link
          href="/admin/products"
          className="text-sm text-black/60 underline underline-offset-4 dark:text-white/60"
        >
          All products
        </Link>
      </div>

      <div className="mt-6">
        <EditProductForm id={product.id} product={initial} />
      </div>
    </>
  );
}
