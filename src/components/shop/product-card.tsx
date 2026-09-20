import Image from "next/image";
import Link from "next/link";

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
 * panel with a square photo, then the name, the price and the badges.
 *
 * The whole card is a single link, so the photo, name and price are one target
 * rather than three.
 */
export function ProductCard({ product }: { product: CardProduct }) {
  return (
    <Link href={product.href} className={`group flex h-full flex-col ${ui.shopCard}`}>
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
        <h3 className="leading-snug font-medium text-nyoki-ink group-hover:underline group-hover:underline-offset-4">
          {product.name}
        </h3>

        <p className="flex items-baseline gap-2 tabular-nums text-nyoki-ink">
          {formatPence(product.pricePence)}
          {product.wasPence !== null ? (
            <>
              <span className="sr-only">was</span>
              <s className="text-sm text-nyoki-text-dark/70">{formatPence(product.wasPence)}</s>
            </>
          ) : null}
        </p>

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
    </Link>
  );
}
