import { notFound } from "next/navigation";

import { EditProductForm } from "@/components/admin/edit-product-form";
import { EditProductImages } from "@/components/admin/edit-product-images";
import { db } from "@/lib/db";
import { closestFirst } from "@/lib/products/also-like";
import { automaticAlsoLike } from "@/lib/storefront/queries";
import type { ProductInput } from "@/lib/products/validate";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const photo = { orderBy: { position: "asc" as const }, take: 1, select: { url: true, alt: true } };
  const [product, categories, chosen, options] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        categories: { select: { categoryId: true } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }),
    // "You may also like": what is chosen, in order, and the pieces on the
    // shop that could be.
    db.alsoLike.findMany({
      where: { productId: id },
      orderBy: { position: "asc" },
      select: { piece: { select: { id: true, name: true, status: true, images: photo } } },
    }),
    db.product.findMany({
      where: { status: "ACTIVE", id: { not: id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, images: photo, categories: { select: { categoryId: true } } },
    }),
  ]);
  if (!product) notFound();

  // What the product's page picks by itself, picked the same way, so the
  // field shows what the shop shows.
  const categoryIds = product.categories.map((link) => link.categoryId);
  const automatic = await automaticAlsoLike(product.id, categoryIds);
  // A replacement is offered nearest first: its own categories, its group,
  // then everything else, each by name.
  const ranked = closestFirst(
    options.map((piece) => ({ ...piece, categoryIds: piece.categories.map((link) => link.categoryId) })),
    categoryIds,
    categories,
  );

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
          alsoLike={{
            options: ranked.map(({ id, name, images }) => ({ id, name, image: images[0] ?? null })),
            automatic: automatic.map(({ id, name, images }) => ({ id, name, image: images[0] ?? null })),
            chosen: chosen.map(({ piece: { images, status, ...piece } }) => ({ ...piece, image: images[0] ?? null, onShop: status === "ACTIVE" })),
          }}
        />
      </div>
    </>
  );
}
