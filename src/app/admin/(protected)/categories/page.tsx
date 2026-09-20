import { ui } from "@/lib/brand/ui";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { PINNED_BLOCK_CLASS, Th } from "@/components/admin/th";
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
        <div className="mt-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Web address</Th>
                <Th align="right">Products</Th>
              </tr>
            </thead>
            <tbody>
              {tree.map(({ row, depth }) => (
                <tr key={row.id} className={`border-b ${ui.tableRow}`}>
                  <td className="py-3 pr-4">
                    <span style={{ paddingLeft: `${depth * 1.25}rem` }} className="inline-block">
                      {depth > 0 ? <span className={`mr-1.5 ${ui.mutedOnPage}`}>└</span> : null}
                      <Link href={`/admin/categories/${row.id}`} className="font-medium underline-offset-4 hover:underline">
                        {row.name}
                      </Link>
                    </span>
                  </td>
                  <td className={`py-3 pr-4 font-mono text-xs ${ui.mutedOnPage}`}>/{row.slug}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{row.productCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
