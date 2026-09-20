import Image from "next/image";
import Link from "next/link";

import { ui } from "@/lib/brand/ui";
import type { CategoryTile } from "@/lib/storefront/tiles";

/**
 * A row of pictures for what sits inside a department.
 *
 * A list of category names tells a shopper nothing about what they are for.
 * Each tile carries a photo from inside it and says how much is there, so the
 * choice is made on the things themselves rather than on the words.
 */
export function CategoryTiles({ heading, tiles }: { heading: string; tiles: CategoryTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <section>
      <h2 className={`text-2xl tracking-tight ${ui.shopHeading}`}>{heading}</h2>

      <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.slug}>
            <Link href={`/shop/${tile.slug}`} className={`group flex h-full flex-col ${ui.shopCard}`}>
              {/* Square, like the photos themselves: a landscape crop slices a card
                  across the middle and throws away its top and bottom. */}
              <div className="relative aspect-square w-full overflow-hidden bg-nyoki-soft-ash">
                {tile.image ? (
                  <Image
                    src={tile.image.url}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : null}
              </div>

              <div className="flex flex-col gap-1 p-4">
                <h3 className="leading-snug font-medium text-nyoki-ink group-hover:underline group-hover:underline-offset-4">
                  {tile.name}
                </h3>
                <p className={`text-xs ${ui.shopMuted}`}>
                  {tile.count} {tile.count === 1 ? "piece" : "pieces"}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
