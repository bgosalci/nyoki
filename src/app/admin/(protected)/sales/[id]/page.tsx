import Link from "next/link";
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
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{sale.name}</h1>
        <Link href="/admin/sales" className="text-sm text-black/60 underline underline-offset-4 dark:text-white/60">
          All sales
        </Link>
      </div>
      <div className="mt-6">
        <EditSaleForm id={sale.id} sale={initial} products={products} />
      </div>
    </>
  );
}
