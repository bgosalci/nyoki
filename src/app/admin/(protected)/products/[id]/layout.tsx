import { notFound } from "next/navigation";

import { ProductSteps } from "@/components/admin/product-steps";
import { SaveSlotProvider } from "@/components/admin/save-slot";
import { ProductHeader } from "@/components/admin/product-header";
import { requireAdmin } from "@/lib/auth/dal";
import { customisationGroup } from "@/lib/customisation/group";
import { db } from "@/lib/db";
import { PRODUCT_LIST_ORDER } from "@/lib/products/filter";

/**
 * What a product's tabs share: the way back, the way on to the pieces
 * either side of it, its name, and the tabs.
 */
export default async function ProductLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  // Checked here as well as in the admin layout, which moving between
  // admin pages does not render again.
  await requireAdmin();

  const { id } = await params;
  const [product, everything, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, select: { id: true, name: true, categories: { select: { categoryId: true } } } }),
    // For stepping through when the piece was not opened from the list.
    db.product.findMany({ orderBy: PRODUCT_LIST_ORDER, select: { id: true, name: true } }),
    db.category.findMany({ select: { id: true, slug: true, parentId: true } }),
  ]);
  if (!product) notFound();

  return (
    <SaveSlotProvider>
      <ProductHeader
        productId={product.id}
        name={product.name}
        customisable={customisationGroup(product.categories.map((link) => link.categoryId), categories) !== null}
        steps={<ProductSteps productId={product.id} fallback={{ href: "/admin/products", items: everything }} />}
      />
      {children}
    </SaveSlotProvider>
  );
}
