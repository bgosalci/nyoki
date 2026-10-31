import Image from "next/image";
import Link from "next/link";

import { ui } from "@/lib/brand/ui";
import { blocksOf, type ShownTile } from "@/lib/home/tiles";

/**
 * The home page's photo tiles, in blocks of five: a large tile and four
 * small, the large one on the left of the first block and the right of the
 * next. Every tile is square, so the large one is exactly two rows tall.
 *
 * Each block is written row by row, so a large tile on the right comes after
 * the two small ones beside it. On a phone, two to a row, that reads as two
 * small, the large across the width, two small.
 */
export function HomeMosaic({ tiles }: { tiles: readonly ShownTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {blocksOf(tiles).map((block, index) => {
        const [large, ...small] = block;
        const ordered = index % 2 === 0 || small.length < 2 ? block : [small[0], small[1], large, ...small.slice(2)];

        return (
          <div key={index} className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {ordered.map((tile) => (
              <Tile key={`${tile.label}-${tile.href}`} tile={tile} large={tile === large} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Tile({ tile, large }: { tile: ShownTile; large: boolean }) {
  return (
    <Link
      href={tile.href}
      className={`group relative block aspect-square overflow-hidden rounded-lg ${ui.shopTilePlain} ${
        large ? "col-span-2 md:row-span-2" : ""
      }`}
    >
      {tile.image ? (
        <>
          <Image
            src={tile.image.url}
            alt=""
            fill
            sizes={large ? "(min-width: 1376px) 680px, (min-width: 768px) 50vw, 100vw" : "(min-width: 1376px) 340px, (min-width: 768px) 25vw, 50vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className={`absolute inset-0 ${ui.shopTileFade}`} aria-hidden="true" />
        </>
      ) : null}
      <span
        className={`absolute left-0 max-w-[calc(100%-1.5rem)] border-b leading-tight font-medium tracking-[0.14em] uppercase ${
          tile.image ? ui.shopTileLabel : ""
        } ${
          large
            ? "bottom-6 pr-5 pb-2.5 pl-6 text-xl md:bottom-8 md:pr-6 md:pb-3 md:pl-9 md:text-3xl"
            : "bottom-4 pr-3 pb-2 pl-4 text-xs md:bottom-5 md:pr-4 md:pl-6 md:text-lg"
        }`}
      >
        {tile.label}
      </span>
    </Link>
  );
}
