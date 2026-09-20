import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/app/admin/(protected)/products/actions";

export default function NewProductPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Add a product</h1>
      <div className="mt-6">
        <ProductForm action={createProduct} submitLabel="Create product" />
      </div>
    </>
  );
}
