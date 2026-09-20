import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/shop/product-grid";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { chainTo, subtreeIds } from "@/lib/products/category-pills";
import { activeProducts, toCards } from "@/lib/storefront/queries";

async function findCategory(slug: string) {
  const categories = await db.category.findMany({ select: { id: true, slug: true, name: true, parentId: true, description: true } });
  return { categories, category: categories.find((c) => c.slug === slug) };
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await findCategory((await params).category);
  return { title: category?.name ?? "Not found" };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { categories, category } = await findCategory((await params).category);
  if (!category) notFound();

  const ids = subtreeIds(categories, category.id);
  const [products, children] = await Promise.all([
    activeProducts({ categories: { some: { categoryId: { in: ids } } } }),
    db.category.findMany({ where: { parentId: category.id }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  // Breadcrumb, minus the category itself, which is the heading.
  const trail = chainTo(categories, category.slug).slice(0, -1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb">
        <ol className={`flex flex-wrap items-center gap-2 text-xs tracking-[0.1em] uppercase ${ui.shopMuted}`}>
          <li>
            <Link href="/shop" className="hover:underline hover:underline-offset-4">Shop</Link>
          </li>
          {trail.map((crumb) => (
            <li key={crumb.id} className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link href={`/shop/${crumb.slug}`} className="hover:underline hover:underline-offset-4">{crumb.name}</Link>
            </li>
          ))}
        </ol>
      </nav>

      <h1 className={`mt-4 text-3xl tracking-tight ${ui.shopHeading}`}>{category.name}</h1>
      {category.description ? (
        <p className={`mt-3 max-w-prose leading-relaxed ${ui.shopMuted}`}>{category.description}</p>
      ) : null}

      {children.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-2">
          {children.map((child) => (
            <li key={child.slug}>
              <Link href={`/shop/${child.slug}`} className={`inline-block px-3 py-1.5 text-xs tracking-[0.1em] uppercase ${ui.shopBadge}`}>
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <p className={`mt-6 text-sm ${ui.shopMuted}`}>{products.length} pieces</p>

      <div className="mt-8">
        {products.length > 0 ? (
          <ProductGrid products={toCards(products)} />
        ) : (
          <p className={`text-sm ${ui.shopMuted}`}>Nothing here just yet. Have a look at the other departments.</p>
        )}
      </div>
    </div>
  );
}
