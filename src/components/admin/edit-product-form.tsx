"use client";

import { ProductForm } from "@/components/admin/product-form";
import { updateProduct } from "@/app/admin/(protected)/products/actions";
import type { ProductInput } from "@/lib/products/validate";

/**
 * Binds the product id to the update action.
 *
 * `bind` has to happen in a client component: passing an already-bound action
 * down from the server page would serialise a new function on every render.
 */
export function EditProductForm({
  id,
  product,
}: {
  id: string;
  product: ProductInput;
}) {
  return (
    <ProductForm
      action={updateProduct.bind(null, id)}
      product={product}
      submitLabel="Save changes"
    />
  );
}
