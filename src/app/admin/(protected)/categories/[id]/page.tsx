import { BackLink } from "@/components/admin/back-link";
import { notFound } from "next/navigation";

import { saveCategoryCosts } from "@/app/admin/(protected)/categories/actions";
import { CategoryCostsForm } from "@/components/admin/category-costs-form";
import { EditCategoryForm } from "@/components/admin/edit-category-form";
import { ui } from "@/lib/brand/ui";
import type { CategoryInput } from "@/lib/categories/validate";
import { db } from "@/lib/db";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [category, categories] = await Promise.all([
    db.category.findUnique({ where: { id }, include: { costLines: { orderBy: { position: "asc" } } } }),
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
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/categories">Back to all categories</BackLink>
        <h1 className="text-xl font-semibold tracking-tight">{category.name}</h1>
      </div>
      <div className="mt-6">
        <EditCategoryForm id={category.id} category={initial} categories={categories} />
      </div>
      <div className={`mt-12 border-t pt-8 ${ui.ruleOnPage}`}>
        <CategoryCostsForm
          categoryName={category.name}
          lines={category.costLines.map(({ label, unitPence, quantityHundredths }) => ({ label, unitPence, quantityHundredths }))}
          action={saveCategoryCosts.bind(null, category.id)}
        />
      </div>
    </>
  );
}
