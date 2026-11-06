"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { CATEGORY_CHANGE_FAILED, CategoryChangeNotice } from "@/components/admin/category-change-notice";
import type { ChooserItem } from "@/components/admin/photo-chooser";
import { PhotoMultiChooser, type PhotoMultiChange } from "@/components/admin/photo-multi-chooser";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ui } from "@/lib/brand/ui";
import type { CategoryChangeResult } from "@/lib/categories/assignment";
import type { ProductStatus } from "@/lib/products/validate";

export interface CategoryProductItem {
  id: string;
  name: string;
  sku: string | null;
  status: ProductStatus;
  image: { url: string; alt: string | null } | null;
  /** Everything it is filed in, by place in the tree. */
  categories: string[];
  inCategory: boolean;
}

/** Said only of a piece not on the shop. */
const OFF_THE_SHOP: Partial<Record<ProductStatus, string>> = { DRAFT: "Draft", ARCHIVED: "Archived" };

const NO_CATEGORY = "In no category";

/**
 * Whatever a tile says, it can be found by - so "no category" finds what is
 * waiting to be filed - and by the code and the photo's file name, which
 * often says what a piece is when nothing else does.
 */
function toChooserItem(product: CategoryProductItem): ChooserItem {
  const off = OFF_THE_SHOP[product.status];
  const where = product.categories.length > 0 ? product.categories.join("; ") : NO_CATEGORY;
  const details = [...(off ? [off] : []), where];
  return {
    id: product.id,
    title: product.name,
    details,
    imageUrl: product.image?.url ?? null,
    searchText: [...details, product.sku ?? "", product.image?.url.split("/").pop() ?? ""].join(" "),
  };
}

/**
 * The products filed in a category, on its own page, and the way to choose
 * many at once: the whole catalogue by photo, what is in it ticked and first.
 * The products list's bulk actions do the same from the other side.
 *
 * Only what is filed directly in it is listed and ticked. A piece in a type
 * inside it is on the shop's page for this category already, so those are
 * counted, and left to the types' own pages.
 */
export function CategoryProducts({
  categoryName,
  products,
  beneath,
  listHref,
  save,
}: {
  categoryName: string;
  /** The whole catalogue, in the list's order. */
  products: CategoryProductItem[];
  /** Pieces in the categories inside this one and not in it themselves. */
  beneath: number;
  /** The products list, filtered to this category and everything inside it. */
  listHref: string;
  save: (change: { add: string[]; remove: string[] }) => Promise<CategoryChangeResult>;
}) {
  const [choosing, setChoosing] = useState(false);
  const [said, setSaid] = useState<string[]>([]);
  const [problem, setProblem] = useState<string>();
  const headingId = useId();

  const inIt = products.filter((product) => product.inCategory);
  const rest = products.filter((product) => !product.inCategory);

  async function apply({ added, removed }: PhotoMultiChange) {
    setProblem(undefined);
    const result: CategoryChangeResult = await save({ add: added, remove: removed }).catch(() => ({ ok: false }));
    if (result.ok) {
      setChoosing(false);
      setSaid(result.said);
    } else {
      setProblem(CATEGORY_CHANGE_FAILED);
    }
  }

  return (
    <section aria-labelledby={headingId} className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-base font-semibold">
            Products in {categoryName}
          </h2>
          <p className={`mt-1 max-w-prose text-sm ${ui.mutedOnPage}`}>
            {inIt.length === 0 ? "No products yet." : `${inIt.length} ${inIt.length === 1 ? "product" : "products"}.`}{" "}
            {beneath > 0 ? (
              <>
                <Link href={listHref} className="underline underline-offset-4">
                  {beneath} more
                </Link>{" "}
                {beneath === 1 ? "is" : "are"} in the categories inside it.{" "}
              </>
            ) : null}
            A product stays in any other categories it is in.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSaid([]);
            setProblem(undefined);
            setChoosing(true);
          }}
          className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonSecondary}`}
        >
          {inIt.length === 0 ? "Choose products" : "Change products"}
        </button>
      </div>

      {said.length > 0 ? <CategoryChangeNotice lines={said} /> : null}

      {inIt.length > 0 ? (
        <ul aria-label={`Products in ${categoryName}`} className="grid max-h-96 gap-x-4 gap-y-1 overflow-y-auto sm:grid-cols-2">
          {inIt.map((product) => (
            <li key={product.id}>
              <Link href={`/admin/products/${product.id}`} className={`flex items-center gap-3 rounded-md p-1.5 text-sm ${ui.navItem}`}>
                <ProductThumbnail image={product.image} />
                <span className="min-w-0">
                  <span className="block font-medium">{product.name}</span>
                  {OFF_THE_SHOP[product.status] ? <span className={`block text-xs ${ui.mutedOnPage}`}>{OFF_THE_SHOP[product.status]}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <PhotoMultiChooser
        open={choosing}
        title={`Products in ${categoryName}`}
        items={[...inIt, ...rest].map(toChooserItem)}
        chosen={inIt.map((product) => product.id)}
        problem={problem}
        onSave={apply}
        onCancel={() => setChoosing(false)}
      />
    </section>
  );
}
