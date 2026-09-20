import { BackLink } from "@/components/admin/back-link";
import { notFound } from "next/navigation";

import { EditSaleForm } from "@/components/admin/edit-sale-form";
import { db } from "@/lib/db";
import type { SaleInput } from "@/lib/sales/validate";

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [sale, products] = await Promise.all([
    db.sale.findUnique({ where: { id }, include: { products: { select: { productId: true } } } }),
    db.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, pricePence: true },
    }),
  ]);

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
      <div className="flex flex-col gap-2">
        <BackLink href="/admin/sales">Back to all sales</BackLink>
        <h1 className="text-xl font-semibold tracking-tight">{sale.name}</h1>
      </div>
      <div className="mt-6">
        <EditSaleForm id={sale.id} sale={initial} products={products} />
      </div>
    </>
  );
}
