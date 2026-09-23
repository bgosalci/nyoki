import { notFound } from "next/navigation";

import { ProductSteps } from "@/components/admin/product-steps";
import { ProductTabs } from "@/components/admin/product-tabs";
import { db } from "@/lib/db";

/**
 * What both of a product's tabs share: the way back, the way on to the pieces
 * either side of it, its name, and the tabs.
 */
export default async function ProductLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!product) notFound();

  return (
    <>
      <div className="flex flex-col gap-3">
        <ProductSteps productId={product.id} />
        <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
      </div>

      <ProductTabs productId={product.id} />

      {children}
    </>
  );
}
