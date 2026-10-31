import { DEFAULT_TILE_WORDS } from "@/lib/home/colours";
import { hrefFor, linkFromRow, linkToRow, WHOLE_SHOP, type HomeLink } from "@/lib/home/links";

/**
 * The home page's photo tiles: words on a photo, leading somewhere.
 *
 * They come in blocks of five - one large tile and four small - which is
 * what the mosaic is drawn from; the large one sits on the left of the first
 * block, the right of the second, and so on.
 */

export const TILES_PER_BLOCK = 5;
export const MAX_BLOCKS = 4;
/** Long enough for "For little dreamers", short enough to sit on a small tile. */
export const TILE_LABEL_MAX = 40;

/** One of the shop's own product photos, or one uploaded for the home page. */
export type TilePhoto = { kind: "shop"; imageId: string } | { kind: "upload"; photoId: string };

export interface TileContent {
  label: string;
  link: HomeLink;
  /** None chosen: a tile leading to a category takes its first piece's photo. */
  photo: TilePhoto | null;
  /** The colour of its words, a brand token from TILE_WORDS. */
  words: string;
}

/** A tile as read for the page or the editor, with its chosen photo's address. */
export interface LoadedTile extends TileContent {
  photoUrl: string | null;
}

/** A tile as the shop draws it. */
export interface ShownTile {
  label: string;
  href: string;
  image: { url: string } | null;
  words: string;
}

export function photoChoice(photo: TilePhoto | null): string {
  if (!photo) return "";
  return photo.kind === "shop" ? `image:${photo.imageId}` : `upload:${photo.photoId}`;
}

/** The photo a posted value means: null is automatic, undefined is unreadable. */
export function readPhoto(value: string): TilePhoto | null | undefined {
  if (value === "") return null;
  const at = value.indexOf(":");
  const kind = value.slice(0, at);
  const id = value.slice(at + 1);
  if (at < 0 || id.length === 0) return undefined;
  if (kind === "image") return { kind: "shop", imageId: id };
  if (kind === "upload") return { kind: "upload", photoId: id };
  return undefined;
}

export function blocksOf<T>(tiles: readonly T[]): T[][] {
  const blocks: T[][] = [];
  for (let start = 0; start < tiles.length; start += TILES_PER_BLOCK) {
    blocks.push(tiles.slice(start, start + TILES_PER_BLOCK));
  }
  return blocks;
}

export interface TileRow {
  label: string;
  categoryId: string | null;
  href: string | null;
  productImageId: string | null;
  photoId: string | null;
  productImage: { url: string } | null;
  photo: { url: string } | null;
  wordColour: string;
}

export function tileFromRow(row: TileRow): LoadedTile {
  const photo: TilePhoto | null = row.productImageId
    ? { kind: "shop", imageId: row.productImageId }
    : row.photoId
      ? { kind: "upload", photoId: row.photoId }
      : null;

  return {
    label: row.label,
    link: linkFromRow(row),
    photo,
    photoUrl: row.productImage?.url ?? row.photo?.url ?? null,
    words: row.wordColour,
  };
}

export function tileToRow(tile: TileContent, position: number) {
  return {
    position,
    label: tile.label,
    ...linkToRow(tile.link),
    productImageId: tile.photo?.kind === "shop" ? tile.photo.imageId : null,
    photoId: tile.photo?.kind === "upload" ? tile.photo.photoId : null,
    wordColour: tile.words,
  };
}

export interface DefaultTile {
  label: string;
  categorySlug: string;
  /** Which of a piece's photos, by its place among them. */
  photo: { productSlug: string; position: number };
}

/**
 * The mosaic before anybody has edited it: the design as approved, each tile
 * named by addresses rather than ids, so it holds for any copy of the shop.
 */
export const DEFAULT_TILES: readonly DefaultTile[] = [
  { label: "For Christmas", categorySlug: "christmas", photo: { productSlug: "let-it-snow", position: 1 } },
  { label: "For love", categorySlug: "valentine-cards", photo: { productSlug: "you-me-always-and-forever", position: 0 } },
  { label: "For birthdays", categorySlug: "birthday-card", photo: { productSlug: "birthday-cake", position: 0 } },
  {
    label: "For Dad",
    categorySlug: "fathers-day-cards",
    photo: { productSlug: "youll-always-be-my-captain-fathers-day-card", position: 0 },
  },
  { label: "For anniversaries", categorySlug: "anniversary", photo: { productSlug: "i-love-you", position: 0 } },
  { label: "For little ones", categorySlug: "clothes", photo: { productSlug: "girls-handmade-double-moss-coat", position: 0 } },
  {
    label: "For book lovers",
    categorySlug: "bookmarks",
    photo: { productSlug: "handmade-personalised-crochet-organic-yarn-zodiac-bookmark", position: 1 },
  },
  { label: "For little dreamers", categorySlug: "accessories", photo: { productSlug: "handmade-merino-bow-hairband", position: 0 } },
  {
    label: "For word lovers",
    categorySlug: "the-definition-collection",
    photo: { productSlug: "definition-of-mother-in-law", position: 2 },
  },
  { label: "Just because", categorySlug: "brooch", photo: { productSlug: "handmade-bamboo-car-brooch-blue", position: 1 } },
];

export interface DefaultsFound {
  categories: readonly { id: string; slug: string }[];
  images: readonly { id: string; url: string; productSlug: string; position: number }[];
}

/**
 * The default tiles, found in this shop. A category not here leads to the
 * whole shop; a photo not here leaves the tile to take its category's.
 */
export function defaultTiles(found: DefaultsFound): LoadedTile[] {
  const categoryIds = new Map(found.categories.map((category) => [category.slug, category.id]));

  return DEFAULT_TILES.map((tile) => {
    const categoryId = categoryIds.get(tile.categorySlug);
    const image = found.images.find(
      (candidate) => candidate.productSlug === tile.photo.productSlug && candidate.position === tile.photo.position,
    );

    return {
      label: tile.label,
      link: categoryId ? { kind: "category", categoryId } : WHOLE_SHOP,
      photo: image ? { kind: "shop", imageId: image.id } : null,
      photoUrl: image?.url ?? null,
      words: DEFAULT_TILE_WORDS,
    };
  });
}

/**
 * The tiles as the shop draws them: each one's address as it stands, and its
 * photo - the one chosen, or else the first piece's where it leads.
 */
export function shownTiles(
  tiles: readonly LoadedTile[],
  categorySlugs: ReadonlyMap<string, string>,
  leadPhotos: ReadonlyMap<string, { url: string }>,
): ShownTile[] {
  return tiles.map((tile) => {
    const lead = tile.link.kind === "category" ? leadPhotos.get(tile.link.categoryId) : undefined;
    const url = tile.photoUrl ?? lead?.url ?? null;

    return { label: tile.label, href: hrefFor(tile.link, categorySlugs), image: url ? { url } : null, words: tile.words };
  });
}
