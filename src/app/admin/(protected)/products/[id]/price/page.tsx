import { notFound } from "next/navigation";

import { savePricing } from "@/app/admin/(protected)/products/[id]/price/actions";
import { PricingEditor } from "@/components/admin/pricing-editor";
import type { EntryLine } from "@/lib/costing/import";
import { rankEntriesFor } from "@/lib/costing/matching";
import { db } from "@/lib/db";

export default async function ProductPricePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" }, select: { url: true, alt: true, phash: true } },
      costLines: { orderBy: { position: "asc" } },
      priceListEntry: { select: { source: true, pricePence: true } },
    },
  });
  if (!product) notFound();

  // Only a piece with no costs of its own is offered rows to choose from.
  const suggestions =
    product.costLines.length > 0
      ? []
      : rankEntriesFor(
          {
            id: product.id,
            name: product.name,
            photoHashes: product.images.map((image) => image.phash).filter((hash): hash is string => hash !== null),
          },
          (await db.priceListEntry.findMany({ where: { productId: null } })).map((entry) => ({
            ...entry,
            filename: entry.photoFilename,
          })),
          // Every row, best guess first: the chooser searches them all.
          { limit: Infinity },
        ).map((entry) => ({
          id: entry.id,
          source: entry.source,
          note: entry.note,
          photoUrl: entry.photoUrl,
          photoFilename: entry.photoFilename,
          pricePence: entry.pricePence,
          vatRate: entry.vatRate,
          lines: entry.lines as unknown as EntryLine[],
        }));

  const image = product.images[0] ?? null;

  // The layout carries the way back, the name and the tabs.
  return (
    <>
      <PricingEditor
        product={{
          id: product.id,
          name: product.name,
          image: image ? { url: image.url, alt: image.alt } : null,
          pricePence: product.pricePence,
          compareAtPence: product.compareAtPence,
          vatRate: product.vatRate,
        }}
        lines={product.costLines.map(({ label, unitPence, quantityHundredths }) => ({ label, unitPence, quantityHundredths }))}
        origin={product.priceListEntry}
        suggestions={suggestions}
        action={savePricing.bind(null, product.id)}
      />
    </>
  );
}
