import { ProductForm } from "@/components/admin/product-form";
import { SaveSlot } from "@/components/admin/save-slot";
import { createProduct } from "@/app/admin/(protected)/products/actions";
import { db } from "@/lib/db";

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Add a product</h1>
        <SaveSlot />
      </div>
      <div className="mt-6">
        <ProductForm action={createProduct} categories={categories} submitLabel="Create product" />
      </div>
    </>
  );
}
