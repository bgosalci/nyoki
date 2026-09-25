import { ProductForm } from "@/components/admin/product-form";
import { SaveSlot, SaveSlotProvider } from "@/components/admin/save-slot";
import { createProduct } from "@/app/admin/(protected)/products/actions";
import { db } from "@/lib/db";

export default async function NewProductPage() {
  const [categories, options] = await Promise.all([
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentId: true },
    }),
    // The pieces on the shop that could be suggested under "You may also like".
    db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } } },
    }),
  ]);

  return (
    <SaveSlotProvider>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Add a product</h1>
        <SaveSlot />
      </div>
      <div className="mt-6">
        <ProductForm
          action={createProduct}
          categories={categories}
          alsoLike={{ options: options.map(({ images, ...piece }) => ({ ...piece, image: images[0] ?? null })), automatic: [], chosen: [] }}
          submitLabel="Create product"
        />
      </div>
    </SaveSlotProvider>
  );
}
