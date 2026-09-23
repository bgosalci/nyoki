import Link from "next/link";
import { notFound } from "next/navigation";

import { savePricing } from "@/app/admin/(protected)/pricing/actions";
import { BackLink } from "@/components/admin/back-link";
import { PricingEditor } from "@/components/admin/pricing-editor";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ui } from "@/lib/brand/ui";
import type { EntryLine } from "@/lib/costing/import";
import { rankEntriesFor } from "@/lib/costing/matching";
import { db } from "@/lib/db";

export default async function PricingEditPage({ params }: { params: Promise<{ id: string }> }) {
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
        ).map((entry) => ({
          id: entry.id,
          source: entry.source,
          note: entry.note,
          photoUrl: entry.photoUrl,
          pricePence: entry.pricePence,
          vatRate: entry.vatRate,
          lines: entry.lines as unknown as EntryLine[],
        }));

  const image = product.images[0] ?? null;

  return (
    <>
      <BackLink href="/admin/pricing">All prices</BackLink>

      <div className="mt-4 flex items-center gap-4">
        <ProductThumbnail image={image ? { url: image.url, alt: image.alt } : null} />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
          <Link href={`/admin/products/${product.id}`} className={`text-sm underline underline-offset-4 ${ui.mutedOnPage}`}>
            Edit the product itself
          </Link>
        </div>
      </div>

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
