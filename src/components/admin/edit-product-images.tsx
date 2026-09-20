"use client";

import { ProductImages, type ProductImageItem } from "@/components/admin/product-images";
import {
  moveProductImage,
  removeProductImage,
  uploadProductImages,
} from "@/app/admin/(protected)/products/[id]/image-actions";

/** Binds the product id to the image actions; see EditProductForm for why this is a client component. */
export function EditProductImages({
  productId,
  images,
}: {
  productId: string;
  images: ProductImageItem[];
}) {
  return (
    <ProductImages
      productId={productId}
      images={images}
      actions={{
        upload: uploadProductImages.bind(null, productId),
        remove: removeProductImage.bind(null, productId),
        move: moveProductImage.bind(null, productId),
      }}
    />
  );
}
