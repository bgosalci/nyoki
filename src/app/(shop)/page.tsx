import Image from "next/image";
import Link from "next/link";

import { toggleFavourite } from "@/app/(shop)/account/actions";
import { ProductGrid } from "@/components/shop/product-grid";
import { PromiseStrip } from "@/components/shop/promise-strip";
import { currentCustomer } from "@/lib/account/dal";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { HOME_DEFAULTS, heroImageFor } from "@/lib/home/content";
import { activeProducts, savedProductIds, toCards } from "@/lib/storefront/queries";

const BUTTON = "inline-block px-6 py-3 text-xs tracking-[0.14em] uppercase";

export default async function HomePage() {
  const shopper = await currentCustomer();

  const HERO_SELECT = {
    id: true,
    name: true,
    slug: true,
    images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
  } as const;

  const [row, groups, newest, savedIds] = await Promise.all([
    db.homePage.findUnique({ where: { id: "home" } }),
    db.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, children: { orderBy: { name: "asc" }, take: 6, select: { slug: true, name: true } } },
    }),
    db.product.findFirst({
      where: { status: "ACTIVE", images: { some: {} } },
      orderBy: { createdAt: "desc" },
      select: HERO_SELECT,
    }),
    savedProductIds(shopper?.id ?? null),
  ]);

  const content = row ?? HOME_DEFAULTS;

  const chosen = content.heroProductId
    ? await db.product.findFirst({
        // Scoped to what is on the shop: a piece archived after it was chosen
        // must not keep leading the page.
        where: { id: content.heroProductId, status: "ACTIVE" },
        select: HERO_SELECT,
      })
    : null;

  const withImage = (piece: { id: string; name: string; slug: string; images: { url: string }[] } | null) =>
    piece ? { ...piece, image: piece.images[0] ?? null } : null;

  const hero = heroImageFor(withImage(chosen), withImage(newest));

  // Whatever has been marked featured, or the newest if nothing has: the row
  // is never empty, and marking one piece is enough to take it over.
  const featured = await activeProducts({ featured: true }, 8);
  const pieces = featured.length > 0 ? featured : await activeProducts({}, 8);

  return (
    <>
      <section className="mx-auto grid max-w-shop items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
        <div className="flex flex-col items-start gap-5">
          <h1 className={`text-4xl leading-tight tracking-tight md:text-5xl ${ui.shopHeading}`}>
            {content.headline}
          </h1>
          {content.intro ? (
            <p className={`max-w-prose leading-relaxed ${ui.shopMuted}`}>{content.intro}</p>
          ) : null}
          <Link href="/shop" className={`${BUTTON} ${ui.shopButton}`}>
            {content.ctaLabel}
          </Link>
        </div>
        {hero?.image ? (
          <Link href={`/product/${hero.slug}`} className="relative block aspect-[4/5] w-full overflow-hidden rounded-lg bg-nyoki-soft-ash">
            <Image
              src={hero.image.url}
              alt={hero.name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
              className="object-cover"
            />
          </Link>
        ) : null}
      </section>

      <PromiseStrip promises={content.promises} />

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
          <h2 className={`text-2xl tracking-tight ${ui.shopHeading}`}>{content.featuredHeading}</h2>
          <Link href="/shop" className="text-xs tracking-[0.14em] text-nyoki-navy uppercase underline underline-offset-4">
            See everything
          </Link>
        </div>
        <div className="mt-8">
          <ProductGrid
            products={toCards(pieces)}
            signedIn={shopper !== null}
            savedIds={savedIds}
            toggleFavourite={toggleFavourite}
          />
        </div>
      </section>
    </>
  );
}
