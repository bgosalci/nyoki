import Link from "next/link";
import { notFound } from "next/navigation";

import { EditCategoryForm } from "@/components/admin/edit-category-form";
import type { CategoryInput } from "@/lib/categories/validate";
import { db } from "@/lib/db";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [category, categories] = await Promise.all([
    db.category.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }),
  ]);

  if (!category) notFound();

  const initial: CategoryInput = {
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
  };

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{category.name}</h1>
        <Link href="/admin/categories" className="text-sm text-black/60 underline underline-offset-4 dark:text-white/60">
          All categories
        </Link>
      </div>
      <div className="mt-6">
        <EditCategoryForm id={category.id} category={initial} categories={categories} />
      </div>
    </>
  );
}
