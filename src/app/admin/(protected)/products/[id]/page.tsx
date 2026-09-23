import { notFound } from "next/navigation";

import { EditProductForm } from "@/components/admin/edit-product-form";
import { EditProductImages } from "@/components/admin/edit-product-images";
import { db } from "@/lib/db";
import type { ProductInput } from "@/lib/products/validate";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        categories: { select: { categoryId: true } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }),
  ]);
  if (!product) notFound();

  // Narrow the database row to exactly what the form needs, so a column added
  // later does not silently become a hidden form field.
  const initial: ProductInput = {
    name: product.name,
    slug: product.slug,
    description: product.description,
    status: product.status,
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
    categoryIds: product.categories.map((link) => link.categoryId),
  };

  return (
    <>
      <div className="mt-6 flex flex-col gap-10">
        <EditProductImages productId={product.id} images={product.images} />
        <EditProductForm
          id={product.id}
          product={initial}
          pricing={{ productId: product.id, pricePence: product.pricePence, compareAtPence: product.compareAtPence }}
          categories={categories}
        />
      </div>
    </>
  );
}
