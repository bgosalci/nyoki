import Link from "next/link";

import { toggleFavourite } from "@/app/(shop)/account/actions";
import { HomeBadges } from "@/components/shop/home-badges";
import { HomeMosaic } from "@/components/shop/home-mosaic";
import { ProductGrid } from "@/components/shop/product-grid";
import { currentCustomer } from "@/lib/account/dal";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { bannerStyle } from "@/lib/home/colours";
import { hrefFor } from "@/lib/home/links";
import { loadHome } from "@/lib/home/load";
import { slugsOnShop } from "@/lib/categories/visibility";
import { shownTiles } from "@/lib/home/tiles";
import { activeProducts, savedProductIds, tileProducts, toCards } from "@/lib/storefront/queries";
import { leadPhotos } from "@/lib/storefront/tiles";

const BUTTON = "inline-block px-7 py-3.5 text-xs tracking-[0.14em] uppercase";

export default async function HomePage() {
  const shopper = await currentCustomer();

  const [{ page, tiles }, categories, savedIds] = await Promise.all([
    loadHome(),
    db.category.findMany({ select: { id: true, slug: true, name: true, parentId: true, active: true } }),
    savedProductIds(shopper?.id ?? null),
  ]);

  // A tile or the button leading to a category off the shop goes to the
  // whole shop until it is back; the tile keeps its photo meanwhile.
  const categorySlugs = slugsOnShop(categories);

  // Only a tile with no photo of its own needs its category's first piece.
  const lending = tiles.flatMap((tile) => (tile.link.kind === "category" && !tile.photoUrl ? [tile.link.categoryId] : []));
  const leads = lending.length > 0 ? leadPhotos(categories, lending, await tileProducts()) : new Map();
  const shown = shownTiles(tiles, categorySlugs, leads);

  // Whatever has been marked featured, or the newest if nothing has: the row
  // is never empty, and marking one piece is enough to take it over.
  const featured = await activeProducts({ featured: true }, 8);
  const pieces = featured.length > 0 ? featured : await activeProducts({}, 8);

  return (
    <>
      {page.showBadges ? (
        <section aria-label="Our promise" className="mx-auto max-w-shop px-4 pt-7 pb-6 sm:px-6 md:pt-10 md:pb-8">
          <HomeBadges />
        </section>
      ) : null}

      {page.bannerText ? (
        <div className={`mx-auto max-w-shop px-4 sm:px-6 ${page.showBadges ? "" : "pt-8 md:pt-10"}`}>
          <h1
            style={bannerStyle(page.bannerGround, page.bannerInk)}
            className="rounded-md px-6 py-10 text-center text-2xl leading-tight font-normal tracking-[0.08em] uppercase md:px-8 md:py-18 md:text-5xl"
          >
            {page.bannerText}
          </h1>
        </div>
      ) : (
        <h1 className="sr-only">Nyoki Handmade</h1>
      )}

      {shown.length > 0 ? (
        <div className="mx-auto mt-3 max-w-shop px-4 sm:px-6 md:mt-4">
          <HomeMosaic tiles={shown} />
        </div>
      ) : null}

      <section className="mx-auto max-w-shop px-4 pt-14 pb-16 sm:px-6 md:pt-18">
        {page.bandText ? (
          <div className={`${ui.shopBandQuiet} rounded-md px-6 py-10 text-center md:px-8 md:py-15`}>
            <h2 className={`mx-auto max-w-4xl text-2xl leading-snug font-light md:text-[2.125rem] ${ui.shopHeading}`}>
              {page.bandText}
            </h2>
          </div>
        ) : (
          <h2 className="sr-only">Pieces we love</h2>
        )}

        <div className="mt-10">
          <ProductGrid products={toCards(pieces)} signedIn={shopper !== null} savedIds={savedIds} toggleFavourite={toggleFavourite} />
        </div>

        <div className="mt-10 flex justify-center">
          <Link href={hrefFor(page.ctaLink, categorySlugs)} className={`${BUTTON} ${ui.shopButtonOutline}`}>
            {page.ctaLabel}
          </Link>
        </div>
      </section>
    </>
  );
}
