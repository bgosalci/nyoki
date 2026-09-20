import { CategoryForm } from "@/components/admin/category-form";
import { createCategory } from "@/app/admin/(protected)/categories/actions";
import { db } from "@/lib/db";

export default async function NewCategoryPage() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true },
  });

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">New category</h1>
      <div className="mt-6">
        <CategoryForm action={createCategory} categories={categories} submitLabel="Create category" />
      </div>
    </>
  );
}
