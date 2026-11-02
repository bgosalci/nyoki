import Image from "next/image";
import Link from "next/link";

import { FavouriteButton } from "@/components/shop/favourite-button";
import { ui } from "@/lib/brand/ui";
import { formatPence } from "@/lib/money";
import type { BadgeTone, CardProduct } from "@/lib/storefront/card";

const TONE: Record<BadgeTone, string> = {
  sale: ui.shopBadgeSale,
  made: ui.shopBadgeMade,
  one: ui.shopBadgeOne,
};

/**
 * One product in a grid or rail, drawn as the theme board has it: a white
 * panel with a square photo, then the name, the price with how many colours
 * it comes in, and the badges.
 *
 * The link stretches over the whole card rather than wrapping it, so the
 * photo, name and price are one target - while the heart on the photo stays a
 * control of its own. A button inside a link is neither valid nor operable.
 */
export function ProductCard({
  product,
  signedIn = false,
  saved = false,
  toggleFavourite,
}: {
  product: CardProduct;
  signedIn?: boolean;
  saved?: boolean;
  /** Absent on a page that does not offer saving; the heart is then left off. */
  toggleFavourite?: (productId: string) => Promise<void>;
}) {
  return (
    <div className={`group relative flex h-full flex-col ${ui.shopCard}`}>
      {toggleFavourite ? (
        <FavouriteButton
          productId={product.id}
          name={product.name}
          saved={saved}
          signedIn={signedIn}
          toggle={toggleFavourite}
          className="absolute top-3 right-3 z-10 shadow-sm"
        />
      ) : null}

      <div className="relative aspect-square w-full overflow-hidden bg-nyoki-soft-ash">
        {product.image ? (
          <Image
            src={product.image.url}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="leading-snug font-medium text-nyoki-ink">
          <Link
            href={product.href}
            className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4"
          >
            {product.name}
          </Link>
        </h3>

        {/* How many colours sits at the far end of the price's line, and
            wraps beneath it on a card too narrow for both. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="flex items-baseline gap-2 tabular-nums text-nyoki-ink">
            {formatPence(product.pricePence)}
            {product.wasPence !== null ? (
              <>
                <span className="sr-only">was</span>
                <s className="text-sm text-nyoki-text-dark/70">{formatPence(product.wasPence)}</s>
              </>
            ) : null}
          </p>

          {product.colours !== null ? (
            // Not flex, so the line's baseline is the words' and they sit
            // level with the price.
            <p className={`text-sm whitespace-nowrap ${ui.shopMuted}`}>
              <span data-colours-dot aria-hidden="true" className={`mr-1.5 inline-block size-3.5 align-[-0.2em] ${ui.shopColoursDot}`} />
              {product.colours} colours
            </p>
          ) : null}
        </div>

        {product.badges.length > 0 ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {product.badges.map((badge) => (
              <li
                key={badge.label}
                className={`px-2 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase ${TONE[badge.tone]}`}
              >
                {badge.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
