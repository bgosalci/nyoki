import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/shop/product-grid";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { formatPence } from "@/lib/money";
import { effectivePricePence } from "@/lib/pricing";
import { chainTo } from "@/lib/products/category-pills";
import { productFacts } from "@/lib/storefront/facts";
import { activeProducts, toCards } from "@/lib/storefront/queries";

async function findProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
      categories: { select: { categoryId: true } },
      sales: { select: { sale: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await findProduct((await params).slug);
  return {
    title: product?.name ?? "Not found",
    description: product?.description?.split("\n")[0] ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await findProduct((await params).slug);
  if (!product) notFound();

  const sales = product.sales.map((link) => link.sale);
  const price = effectivePricePence(product.pricePence, sales, new Date());
  const facts = productFacts(product);

  const categoryIds = product.categories.map((link) => link.categoryId);
  const [categories, related] = await Promise.all([
    db.category.findMany({ select: { id: true, slug: true, name: true, parentId: true } }),
    categoryIds.length > 0
      ? activeProducts({ slug: { not: product.slug }, categories: { some: { categoryId: { in: categoryIds } } } }, 4)
      : Promise.resolve([]),
  ]);

  const own = categories.find((c) => c.id === categoryIds[0]);
  const trail = own ? chainTo(categories, own.slug) : [];
  const wasPence = price.sale ? product.pricePence : product.compareAtPence;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb">
        <ol className={`flex flex-wrap items-center gap-2 text-sm font-medium tracking-[0.1em] uppercase ${ui.shopMuted}`}>
          <li><Link href="/shop" className="hover:underline hover:underline-offset-4">Shop</Link></li>
          {trail.map((crumb) => (
            <li key={crumb.id} className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link href={`/shop/${crumb.slug}`} className="hover:underline hover:underline-offset-4">{crumb.name}</Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          {product.images.map((image, index) => (
            <div key={image.id} className="relative aspect-square w-full overflow-hidden rounded-lg bg-nyoki-soft-ash">
              <Image
                src={image.url}
                alt={image.alt ?? (index === 0 ? product.name : "")}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                priority={index === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6 md:sticky md:top-40 md:self-start">
          <div className="flex flex-col gap-3">
            <h1 className={`text-3xl leading-tight tracking-tight ${ui.shopHeading}`}>{product.name}</h1>
            <p className="flex items-baseline gap-3 text-xl tabular-nums">
              {formatPence(price.pricePence)}
              {wasPence !== null ? (
                <>
                  <span className="sr-only">was</span>
                  <s className={`text-base ${ui.shopMuted}`}>{formatPence(wasPence)}</s>
                </>
              ) : null}
            </p>
            {price.sale ? (
              <p className={`self-start px-2 py-1 text-xs tracking-wider uppercase ${ui.shopBand}`}>{price.sale.name}</p>
            ) : null}
          </div>

          {product.description ? (
            <div className={`flex flex-col gap-3 leading-relaxed ${ui.shopMuted}`}>
              {product.description.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          {product.variants.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className={`text-xs tracking-[0.14em] uppercase ${ui.shopHeading}`}>Available in</p>
              <ul className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <li key={variant.id} className={`px-3 py-1.5 text-sm ${ui.shopBadge}`}>
                    {variant.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ul className={`flex flex-wrap gap-2 text-xs tracking-wider uppercase`}>
            {product.oneOfAKind ? <li className={`px-2 py-1 ${ui.shopBand}`}>One of a kind</li> : null}
            {product.madeToOrder ? (
              <li className={`px-2 py-1 ${ui.shopBadge}`}>
                Made to order{product.leadTimeDays ? ` · ${product.leadTimeDays} days` : ""}
              </li>
            ) : null}
          </ul>

          {facts.length > 0 ? (
            <details className={`border-t pt-4 ${ui.shopRule}`} open>
              <summary className={`cursor-pointer text-xs tracking-[0.14em] uppercase ${ui.shopHeading}`}>
                Need to know
              </summary>
              <dl className="mt-4 flex flex-col gap-3">
                {facts.map((fact) => (
                  <div key={fact.label} className="grid grid-cols-[6rem_1fr] gap-3">
                    <dt className={`text-xs tracking-[0.1em] uppercase ${ui.shopMuted}`}>{fact.label}</dt>
                    <dd className={`text-sm leading-relaxed ${ui.shopMuted}`}>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}

          <p className={`border-t pt-4 text-sm ${ui.shopRule} ${ui.shopMuted}`}>
            Online ordering is coming soon. In the meantime, get in touch to buy this piece.
          </p>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-20">
          <h2 className={`text-2xl tracking-tight ${ui.shopHeading}`}>You may also like</h2>
          <div className="mt-8">
            <ProductGrid products={toCards(related)} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
