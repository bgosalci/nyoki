import { SaleForm } from "@/components/admin/sale-form";
import { createSale } from "@/app/admin/(protected)/sales/actions";
import { categoryPaths, pathsOf } from "@/lib/categories/path";
import { db } from "@/lib/db";

export default async function NewSalePage() {
  // Archived products are hidden from the shop, so they cannot be on sale.
  const [found, categories] = await Promise.all([
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

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">New sale</h1>
      <div className="mt-6">
        <SaleForm action={createSale} products={products} submitLabel="Create sale" />
      </div>
    </>
  );
}
