import { BackLink } from "@/components/admin/back-link";
import { notFound } from "next/navigation";

import { EditSaleForm } from "@/components/admin/edit-sale-form";
import { categoryPaths, pathsOf } from "@/lib/categories/path";
import { db } from "@/lib/db";
import type { SaleInput } from "@/lib/sales/validate";

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [sale, found, categories] = await Promise.all([
    db.sale.findUnique({ where: { id }, include: { products: { select: { productId: true } } } }),
    db.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, pricePence: true, categories: { select: { categoryId: true } } },
    }),
    db.category.findMany({ select: { id: true, name: true, parentId: true } }),
  ]);

  // Each product's categories by their places in the tree, for the picker to find it by.
  const paths = categoryPaths(categories);
  const products = found.map(({ categories: links, ...product }) => ({
    ...product,
    categories: pathsOf(links.map((link) => link.categoryId), paths),
  }));

  if (!sale) notFound();

  const initial: SaleInput = {
    name: sale.name,
    type: sale.type,
    value: sale.value,
    startsAt: sale.startsAt,
    endsAt: sale.endsAt,
    active: sale.active,
    productIds: sale.products.map((p) => p.productId),
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/sales">Back to all sales</BackLink>
        <h1 className="text-xl font-semibold tracking-tight">{sale.name}</h1>
      </div>
      <div className="mt-6">
        <EditSaleForm id={sale.id} sale={initial} products={products} />
      </div>
    </>
  );
}
