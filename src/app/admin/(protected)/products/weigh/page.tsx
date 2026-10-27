import type { Metadata } from "next";

import { saveWeights } from "@/app/admin/(protected)/products/weigh/actions";
import { BackLink } from "@/components/admin/back-link";
import { WeighSheet } from "@/components/admin/weigh-sheet";
import { ui } from "@/lib/brand/ui";
import { categoryPaths, pathsOf } from "@/lib/categories/path";
import { db } from "@/lib/db";
import { deliverySettings, postageCategories, rateSources } from "@/lib/delivery/store";
import { usualFor } from "@/lib/delivery/usual";
import { PRODUCT_LIST_ORDER } from "@/lib/products/filter";

export const metadata: Metadata = { title: "Weigh pieces" };

/** Every piece on the shop in one sheet, for entering weights along the shelf. */
export default async function WeighPage() {
  const [products, categories, settings, rates] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: PRODUCT_LIST_ORDER,
      select: {
        id: true,
        name: true,
        weightGrams: true,
        parcelSize: true,
        thicknessMm: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        categories: { select: { categoryId: true } },
      },
    }),
    postageCategories(),
    deliverySettings(),
    rateSources({ activeOnly: true }),
  ]);
  const paths = categoryPaths(categories);

  return (
    <>
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/products">Back to products</BackLink>
        <h1 className="text-xl font-semibold tracking-tight">Weigh pieces</h1>
        <p className={`max-w-prose text-sm ${ui.mutedOnPage}`}>
          Weigh each piece in its own wrapping, without the outer envelope or box: that is added for the parcel in Settings › Delivery. Leave a box empty to
          use its category&rsquo;s usual. Enter moves down a row.
        </p>
      </div>
      <div className="mt-6">
        <WeighSheet
          rows={products.map((piece) => {
            const ids = piece.categories.map((link) => link.categoryId);
            return {
              id: piece.id,
              name: piece.name,
              image: piece.images[0]?.url ?? null,
              categories: pathsOf(ids, paths),
              own: { grams: piece.weightGrams, size: piece.parcelSize, mm: piece.thicknessMm },
              usual: usualFor(ids, categories),
            };
          })}
          context={{ settings, rates }}
          action={saveWeights}
        />
      </div>
    </>
  );
}
