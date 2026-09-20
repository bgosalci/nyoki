import { CategoryTable } from "@/components/admin/category-table";
import { ui } from "@/lib/brand/ui";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { PINNED_BLOCK_CLASS } from "@/components/admin/th";
import Link from "next/link";

import { flattenTree } from "@/lib/categories/tree";
import { db } from "@/lib/db";

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  const tree = flattenTree(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      productCount: c._count.products,
    })),
  );

  return (
    <>
      <PinnedHeight className={PINNED_BLOCK_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
          <Link
            href="/admin/categories/new"
            className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonPrimary}`}
          >
            New category
          </Link>
        </div>
      </PinnedHeight>

      {tree.length === 0 ? (
        <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.ruleOnPage}`}>
          <p className={`text-sm ${ui.mutedOnPage}`}>
            No categories yet. Categories group products on the shop, and can sit inside one another.
          </p>
          <Link href="/admin/categories/new" className="mt-2 inline-block text-sm underline underline-offset-4">
            Create the first one
          </Link>
        </div>
      ) : (
        <CategoryTable branches={tree} />
      )}
    </>
  );
}
