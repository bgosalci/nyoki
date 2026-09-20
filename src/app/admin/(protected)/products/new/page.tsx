import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/app/admin/(protected)/products/actions";
import { db } from "@/lib/db";

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true },
  });

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Add a product</h1>
      <div className="mt-6">
        <ProductForm action={createProduct} categories={categories} submitLabel="Create product" />
      </div>
    </>
  );
}
