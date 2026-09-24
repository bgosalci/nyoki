import { notFound } from "next/navigation";

import { ProductSteps } from "@/components/admin/product-steps";
import { SaveSlotProvider } from "@/components/admin/save-slot";
import { ProductHeader } from "@/components/admin/product-header";
import { db } from "@/lib/db";
import { PRODUCT_LIST_ORDER } from "@/lib/products/filter";

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
  const [product, everything] = await Promise.all([
    db.product.findUnique({ where: { id }, select: { id: true, name: true } }),
    // For stepping through when the piece was not opened from the list.
    db.product.findMany({ orderBy: PRODUCT_LIST_ORDER, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <SaveSlotProvider>
      <ProductSteps productId={product.id} fallback={{ href: "/admin/products", items: everything }} />
      <ProductHeader productId={product.id} name={product.name} />
      {children}
    </SaveSlotProvider>
  );
}
