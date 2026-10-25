"use client";

import type { AlsoLikeOption, ChosenPiece } from "@/components/admin/also-like-field";
import { ProductForm, type ProductFormCategory, type ProductFormClothing } from "@/components/admin/product-form";
import type { PickerProduct } from "@/components/admin/product-picker";
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
  pricing,
  categories,
  clothing,
  alsoLike,
}: {
  id: string;
  product: ProductInput;
  pricing: { productId: string; pricePence: number; compareAtPence: number | null };
  categories: ProductFormCategory[];
  clothing: ProductFormClothing;
  alsoLike: { options: AlsoLikeOption[]; automatic: PickerProduct[]; chosen: ChosenPiece[] };
}) {
  return (
    <ProductForm
      action={updateProduct.bind(null, id)}
      product={product}
      pricing={pricing}
      categories={categories}
      clothing={clothing}
      alsoLike={alsoLike}
      submitLabel="Save changes"
    />
  );
}
