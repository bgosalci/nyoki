import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { exportFilename, productsCsv } from "@/lib/export/products";
import { subtreeIds } from "@/lib/products/category-pills";
import { PRODUCT_LIST_ORDER, parseProductFilter, productWhere } from "@/lib/products/filter";

/**
 * Every product as the database holds it, as a CSV file - filtered as the
 * list was, so with no filter it is the whole catalogue.
 *
 * A route handler is not wrapped by the protected layout, so it checks the
 * account itself: the file holds every cost and margin in the shop.
 */
export async function GET(request: NextRequest) {
  await requireAdmin();

  const filter = parseProductFilter(Object.fromEntries(request.nextUrl.searchParams));

  const categories = await db.category.findMany({ select: { id: true, slug: true, name: true, parentId: true } });
  const selected = filter.category ? categories.find((category) => category.slug === filter.category) : undefined;
  const categoryIds = selected ? subtreeIds(categories, selected.id) : [];

  const products = await db.product.findMany({
    where: productWhere(filter, categoryIds),
    orderBy: PRODUCT_LIST_ORDER,
    include: {
      images: { orderBy: { position: "asc" }, select: { url: true } },
      costLines: { orderBy: { position: "asc" } },
      categories: { select: { category: { select: { name: true } } } },
    },
  });

  const csv = productsCsv(
    products.map((product) => ({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      status: product.status,
      categories: product.categories.map((link) => link.category.name).sort(),
      pricePence: product.pricePence,
      compareAtPence: product.compareAtPence,
      vatRate: product.vatRate,
      stock: product.stock,
      madeToOrder: product.madeToOrder,
      description: product.description,
      materials: product.materials,
      dimensions: product.dimensions,
      careInstructions: product.careInstructions,
      weightGrams: product.weightGrams,
      featured: product.featured,
      oneOfAKind: product.oneOfAKind,
      leadTimeDays: product.leadTimeDays,
      photos: product.images.map((image) => image.url),
      lines: product.costLines.map(({ label, unitPence, quantityHundredths }) => ({ label, unitPence, quantityHundredths })),
    })),
    { origin: request.nextUrl.origin },
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(new Date())}"`,
      // Costs and margins: never kept by a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
