import Image from "next/image";
import Link from "next/link";

import { formatPence } from "@/lib/money";
import type { CardProduct } from "@/lib/storefront/card";

/**
 * One product in a grid or rail. The whole card is a single link, so the image,
 * name and price are one target rather than three.
 */
export function ProductCard({ product }: { product: CardProduct }) {
  return (
    <Link href={product.href} className="group flex flex-col gap-3">
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
        {product.badges.length > 0 ? (
          <ul className="absolute top-0 left-0 flex flex-col items-start gap-px">
            {product.badges.map((badge) => (
              <li key={badge} className="bg-nyoki-sage px-2 py-1 text-[11px] tracking-wider text-nyoki-ink uppercase">
                {badge}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm leading-snug text-nyoki-navy group-hover:underline">{product.name}</h3>
        <p className="flex items-baseline gap-2 text-sm tabular-nums text-nyoki-ink">
          {formatPence(product.pricePence)}
          {product.wasPence !== null ? (
            <>
              <span className="sr-only">was</span>
              <s className="text-nyoki-text-dark/70">{formatPence(product.wasPence)}</s>
            </>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
