import Image from "next/image";
import Link from "next/link";

import { ProductGrid } from "@/components/shop/product-grid";
import { PromiseStrip } from "@/components/shop/promise-strip";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { activeProducts, toCards } from "@/lib/storefront/queries";

const BUTTON = "inline-block px-6 py-3 text-xs tracking-[0.14em] uppercase";

export default async function HomePage() {
  const [newest, groups, hero] = await Promise.all([
    activeProducts({}, 8),
    db.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, children: { orderBy: { name: "asc" }, take: 6, select: { slug: true, name: true } } },
    }),
    db.product.findFirst({
      where: { status: "ACTIVE", images: { some: {} } },
      orderBy: { createdAt: "desc" },
      select: { name: true, slug: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } },
    }),
  ]);

  return (
    <>
      <section className="mx-auto grid max-w-shop items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
        <div className="flex flex-col items-start gap-5">
          <h1 className={`text-4xl leading-tight tracking-tight md:text-5xl ${ui.shopHeading}`}>
            Made by hand, the kind way
          </h1>
          <p className={`max-w-prose leading-relaxed ${ui.shopMuted}`}>
            Cards, clothes and little things for the home — crocheted, stitched and printed in the UK.
            A tradition carried from our mothers and grandmothers in Kosovo, made for now.
          </p>
          <Link href="/shop" className={`${BUTTON} ${ui.shopButton}`}>
            Shop everything
          </Link>
        </div>
        {hero?.images[0] ? (
          <Link href={`/product/${hero.slug}`} className="relative block aspect-[4/5] w-full overflow-hidden rounded-lg bg-nyoki-soft-ash">
            <Image
              src={hero.images[0].url}
              alt={hero.name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
              className="object-cover"
            />
          </Link>
        ) : null}
      </section>

      <PromiseStrip />

      <section className="mx-auto max-w-shop px-4 py-14 sm:px-6">
        <h2 className={`text-2xl tracking-tight ${ui.shopHeading}`}>Have a look around</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.slug} className="flex flex-col gap-3">
              <h3 className={`text-xs tracking-[0.14em] uppercase ${ui.shopHeading}`}>{group.name}</h3>
              <ul className="flex flex-col gap-1.5">
                {group.children.map((child) => (
                  <li key={child.slug}>
                    <Link href={`/shop/${child.slug}`} className={`text-sm hover:underline hover:underline-offset-4 ${ui.shopMuted}`}>
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={`/shop/${group.slug}`} className="text-xs tracking-[0.14em] text-nyoki-navy uppercase underline underline-offset-4">
                All {group.name.toLowerCase()}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-shop px-4 pb-16 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className={`text-2xl tracking-tight ${ui.shopHeading}`}>Just made</h2>
          <Link href="/shop" className="text-xs tracking-[0.14em] text-nyoki-navy uppercase underline underline-offset-4">
            See everything
          </Link>
        </div>
        <div className="mt-8">
          <ProductGrid products={toCards(newest)} />
        </div>
      </section>
    </>
  );
}
