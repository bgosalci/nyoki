import { CategoryTable } from "@/components/admin/category-table";
import { requireAdmin } from "@/lib/auth/dal";
import { ui } from "@/lib/brand/ui";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { PINNED_BLOCK_CLASS } from "@/components/admin/th";
import Link from "next/link";

import { moveCategory } from "@/app/admin/(protected)/categories/actions";
import { CATEGORY_ORDER } from "@/lib/categories/ordering";
import { db } from "@/lib/db";

export default async function CategoriesPage() {
  // Checked here as well as in the admin layout, which moving between
  // admin pages does not render again.
  await requireAdmin();

  const categories = await db.category.findMany({
    orderBy: CATEGORY_ORDER,
    include: { _count: { select: { products: true } } },
  });

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
      <Link
        href="/admin/categories/new"
        className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonPrimary}`}
      >
        New category
      </Link>
    </div>
  );

  if (categories.length === 0) {
    return (
      <>
        <PinnedHeight className={PINNED_BLOCK_CLASS}>{header}</PinnedHeight>
        <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.ruleOnPage}`}>
          <p className={`text-sm ${ui.mutedOnPage}`}>
            No categories yet. Categories group products on the shop, and can sit inside one another.
          </p>
          <Link href="/admin/categories/new" className="mt-2 inline-block text-sm underline underline-offset-4">
            Create the first one
          </Link>
        </div>
      </>
    );
  }

  return (
    <CategoryTable
      header={header}
      categories={categories.map((c) => ({
        id: c.id,
        parentId: c.parentId,
        name: c.name,
        slug: c.slug,
        productCount: c._count.products,
      }))}
      move={moveCategory}
    />
  );
}
