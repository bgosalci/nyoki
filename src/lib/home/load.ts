import { db } from "@/lib/db";
import { HOME_DEFAULTS, pageFromRow, type HomePageContent } from "@/lib/home/content";
import { DEFAULT_TILES, defaultTiles, tileFromRow, type LoadedTile } from "@/lib/home/tiles";

export interface LoadedHome {
  page: HomePageContent;
  tiles: LoadedTile[];
}

/**
 * The home page as saved, or as designed where it never has been: the shop
 * and the editor both start here, so the editor opens on exactly what the
 * shop shows.
 */
export async function loadHome(): Promise<LoadedHome> {
  const [row, rows] = await Promise.all([
    db.homePage.findUnique({ where: { id: "home" } }),
    db.homeTile.findMany({
      orderBy: { position: "asc" },
      include: { productImage: { select: { url: true } }, photo: { select: { url: true } } },
    }),
  ]);

  const page = row ? pageFromRow(row) : HOME_DEFAULTS;
  if (rows.length > 0) return { page, tiles: rows.map(tileFromRow) };

  const [categories, images] = await Promise.all([
    db.category.findMany({
      where: { slug: { in: DEFAULT_TILES.map((tile) => tile.categorySlug) } },
      select: { id: true, slug: true },
    }),
    db.productImage.findMany({
      where: { product: { slug: { in: DEFAULT_TILES.map((tile) => tile.photo.productSlug) } } },
      select: { id: true, url: true, position: true, product: { select: { slug: true } } },
    }),
  ]);

  return {
    page,
    tiles: defaultTiles({
      categories,
      images: images.map(({ product, ...image }) => ({ ...image, productSlug: product.slug })),
    }),
  };
}
