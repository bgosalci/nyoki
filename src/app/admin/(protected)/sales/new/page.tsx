import { SaleForm } from "@/components/admin/sale-form";
import { createSale } from "@/app/admin/(protected)/sales/actions";
import { db } from "@/lib/db";

export default async function NewSalePage() {
  // Archived products are hidden from the shop, so they cannot be on sale.
  const products = await db.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, pricePence: true },
  });

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">New sale</h1>
      <div className="mt-6">
        <SaleForm action={createSale} products={products} submitLabel="Create sale" />
      </div>
    </>
  );
}
