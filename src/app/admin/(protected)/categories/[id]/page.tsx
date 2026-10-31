import { BackLink } from "@/components/admin/back-link";
import { notFound } from "next/navigation";

import { saveCategoryCosts, saveCategoryPostage } from "@/app/admin/(protected)/categories/actions";
import { CategoryCostsForm } from "@/components/admin/category-costs-form";
import { CategoryPostageForm } from "@/components/admin/category-postage-form";
import { EditCategoryForm } from "@/components/admin/edit-category-form";
import { ui } from "@/lib/brand/ui";
import type { CategoryInput } from "@/lib/categories/validate";
import { db } from "@/lib/db";
import { postageCategories } from "@/lib/delivery/store";
import { usualFor } from "@/lib/delivery/usual";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [category, categories, postage, live] = await Promise.all([
    db.category.findUnique({ where: { id }, include: { costLines: { orderBy: { position: "asc" } } } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }),
    postageCategories(),
    db.product.findMany({ where: { status: "ACTIVE" }, select: { weightGrams: true, categories: { select: { categoryId: true } } } }),
  ]);

  if (!category) notFound();

  // The live pieces this category's usual postage reaches: nothing nearer has one of its own.
  const reached = live.filter((piece) => usualFor(piece.categories.map((link) => link.categoryId), postage)?.categoryId === category.id);
  const weighed = reached.filter((piece) => piece.weightGrams !== null).length;

  const initial: CategoryInput = {
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
    labelColour: category.labelColour,
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
        <CategoryPostageForm
          categoryName={category.name}
          usual={{ grams: category.usualGrams, size: category.usualParcelSize, mm: category.usualThicknessMm }}
          users={reached.length - weighed}
          weighed={weighed}
          action={saveCategoryPostage.bind(null, category.id)}
        />
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
