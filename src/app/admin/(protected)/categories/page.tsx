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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
        <Link
          href="/admin/categories/new"
          className="rounded-md bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-neutral-900"
        >
          New category
        </Link>
      </div>

      {tree.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-black/15 p-10 text-center dark:border-white/15">
          <p className="text-sm text-black/60 dark:text-white/60">
            No categories yet. Categories group products on the shop, and can sit inside one another.
          </p>
          <Link href="/admin/categories/new" className="mt-2 inline-block text-sm underline underline-offset-4">
            Create the first one
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-md border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left dark:border-white/10">
                <th className="py-2.5 pr-4 font-medium">Name</th>
                <th className="py-2.5 pr-4 font-medium">Web address</th>
                <th className="py-2.5 pr-4 text-right font-medium">Products</th>
              </tr>
            </thead>
            <tbody>
              {tree.map(({ row, depth }) => (
                <tr key={row.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-3 pr-4">
                    <span style={{ paddingLeft: `${depth * 1.25}rem` }} className="inline-block">
                      {depth > 0 ? <span className="mr-1.5 text-black/30 dark:text-white/30">└</span> : null}
                      <Link href={`/admin/categories/${row.id}`} className="font-medium underline-offset-4 hover:underline">
                        {row.name}
                      </Link>
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-black/60 dark:text-white/60">/{row.slug}</td>
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
