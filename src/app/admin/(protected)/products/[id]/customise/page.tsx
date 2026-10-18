import { notFound } from "next/navigation";

import { saveCustomisation } from "@/app/admin/(protected)/products/[id]/customise/actions";
import { CustomiseForm } from "@/components/admin/customise-form";
import { ui } from "@/lib/brand/ui";
import { customisationGroup } from "@/lib/customisation/group";
import { customiseValues } from "@/lib/customisation/settings";
import { db } from "@/lib/db";

export default async function ProductCustomisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        customisation: true,
        personalisationFields: { orderBy: { position: "asc" } },
        packs: { orderBy: { position: "asc" } },
        categories: { select: { categoryId: true } },
      },
    }),
    db.category.findMany({ select: { id: true, slug: true, parentId: true } }),
  ]);
  if (!product) notFound();

  const noun = customisationGroup(product.categories.map((link) => link.categoryId), categories);
  // The tab is only offered to cards and bookmarks; this is for an address
  // typed or kept from before the piece moved category.
  if (!noun) {
    return (
      <p className={`mt-8 max-w-prose text-sm ${ui.mutedOnPage}`}>
        Only cards and bookmarks can be customised. Put this piece in Cards or Bookmarks on its Details tab first.
      </p>
    );
  }

  return (
    <CustomiseForm
      noun={noun}
      singlePricePence={product.pricePence}
      values={customiseValues(product.customisation, product.personalisationFields, product.packs)}
      action={saveCustomisation.bind(null, product.id)}
    />
  );
}
