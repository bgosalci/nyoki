import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryTiles } from "@/components/shop/category-tiles";
import { ProductGrid } from "@/components/shop/product-grid";
import { PromiseStrip } from "@/components/shop/promise-strip";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { chainTo, subtreeIds } from "@/lib/products/category-pills";
import { categoryIntro, pluralise } from "@/lib/storefront/category-copy";
import { activeProducts, tileProducts, toCards } from "@/lib/storefront/queries";
import { categoryTiles } from "@/lib/storefront/tiles";

async function findCategory(slug: string) {
  const categories = await db.category.findMany({
    select: { id: true, slug: true, name: true, parentId: true, description: true },
  });

  return { categories, category: categories.find((c) => c.slug === slug) };
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await findCategory((await params).category);
  if (!category) return { title: "Not found" };

  // The intro doubles as the search-result summary, so a category that has
  // been written up properly reads properly in Google too.
  return { title: category.name, description: categoryIntro(category) };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { categories, category } = await findCategory((await params).category);
  if (!category) notFound();

  const ids = subtreeIds(categories, category.id);
  const [products, forTiles] = await Promise.all([
    activeProducts({ categories: { some: { categoryId: { in: ids } } } }),
    tileProducts(),
  ]);

  const cards = toCards(products);
  const inside = categoryTiles(categories, category.id, forTiles);
  const cover = cards.find((card) => card.image)?.image ?? null;

  // Breadcrumb, minus the category itself, which is the heading.
  const trail = chainTo(categories, category.slug).slice(0, -1);

  return (
    <>
      <section className={ui.shopBandQuiet}>
        <div className="mx-auto grid max-w-shop gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-center md:py-12">
          <div className="flex flex-col items-start gap-4">
            <nav aria-label="Breadcrumb">
              <ol className={`flex flex-wrap items-center gap-2 text-xs font-medium tracking-[0.1em] uppercase ${ui.shopMuted}`}>
                <li>
                  <Link href="/shop" className="hover:underline hover:underline-offset-4">Shop</Link>
                </li>
                {trail.map((crumb) => (
                  <li key={crumb.id} className="flex items-center gap-2">
                    <span aria-hidden="true">/</span>
                    <Link href={`/shop/${crumb.slug}`} className="hover:underline hover:underline-offset-4">
                      {crumb.name}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            <h1 className={`text-3xl tracking-tight md:text-4xl ${ui.shopHeading}`}>{category.name}</h1>

            <p className="max-w-prose leading-relaxed">{categoryIntro(category)}</p>

            <p className={`text-sm ${ui.shopMuted}`}>
              {products.length} {products.length === 1 ? "piece" : "pieces"} to choose from
            </p>
          </div>

          {cover ? (
            // Upright rather than wide, and sized to sit inside the band. The
            // catalogue is photographed square on white, with anything from no
            // margin to nearly half the frame given over to it, so an upright
            // crop takes the sides off - which is where that white is - without
            // guessing at a zoom that would be wrong for most of them.
            <div className="relative aspect-[3/4] h-52 overflow-hidden rounded-lg bg-nyoki-soft-ash md:h-64">
              <Image
                src={cover.url}
                alt=""
                fill
                sizes="(min-width: 768px) 12rem, 10rem"
                priority
                // A cover crop can only take the sides off; the small zoom
                // reaches the top and bottom too. Kept gentle on purpose - a
                // photo shot tight to the card has no margin to spare.
                className="scale-110 object-cover"
              />
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto flex max-w-shop flex-col gap-14 px-4 py-12 sm:px-6">
        <CategoryTiles heading={`${pluralise(category.name)} by type`} tiles={inside} />

        <section>
          <h2 className={`text-2xl tracking-tight ${ui.shopHeading}`}>
            {inside.length > 0 ? `Everything in ${category.name}` : category.name}
          </h2>

          <div className="mt-6">
            {cards.length > 0 ? (
              <ProductGrid products={cards} />
            ) : (
              <p className={`text-sm ${ui.shopMuted}`}>
                Nothing here just yet.{" "}
                <Link href="/shop" className="underline underline-offset-4">Have a look at everything else</Link>.
              </p>
            )}
          </div>
        </section>
      </div>

      <PromiseStrip />
    </>
  );
}
