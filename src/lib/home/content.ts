/**
 * The home page's editable content.
 *
 * Everything on the page that is not simply the catalogue: whether the
 * badges show, the banner's words, the photo tiles (their words, where each
 * leads and its photo), the band above the pieces, and the button beneath
 * them. The badges themselves are artwork and are not edited here.
 */

import { DEFAULT_BANNER, DEFAULT_TILE_WORDS, isTileWords, readsOn } from "@/lib/home/colours";
import { linkFromRow, linkToRow, readLink, WHOLE_SHOP, type HomeLink } from "@/lib/home/links";
import { MAX_BLOCKS, readPhoto, TILE_LABEL_MAX, TILES_PER_BLOCK, type TileContent } from "@/lib/home/tiles";

export interface HomePageContent {
  showBadges: boolean;
  /** The banner's words. Empty takes the banner off. */
  bannerText: string;
  /** Its colour and its words', as brand tokens, in a pairing that reads. */
  bannerGround: string;
  bannerInk: string;
  /** The quiet band above the pieces. Empty takes the band off. */
  bandText: string;
  ctaLabel: string;
  ctaLink: HomeLink;
}

export interface HomeContent extends HomePageContent {
  tiles: TileContent[];
}

/**
 * What the page says before anybody has edited it.
 *
 * A complete page rather than placeholder text: a shop that never opens this
 * screen still reads as written, not as a form somebody forgot to fill in.
 * The tiles' defaults are `DEFAULT_TILES`.
 */
export const HOME_DEFAULTS: HomePageContent = {
  showBadges: true,
  bannerText: "Start with who you’re thinking of",
  bannerGround: DEFAULT_BANNER.ground,
  bannerInk: DEFAULT_BANNER.ink,
  bandText: "Our most-loved handmade pieces, from friendship to forever love, for every heartfelt occasion.",
  ctaLabel: "See everything",
  ctaLink: WHOLE_SHOP,
};

export const BANNER_MAX = 80;
export const BAND_MAX = 200;
export const BUTTON_MAX = 40;

export interface TileErrors {
  label?: string;
  link?: string;
  photo?: string;
  colour?: string;
}

export interface HomeErrors {
  bannerText?: string;
  bannerColour?: string;
  bandText?: string;
  ctaLabel?: string;
  ctaLink?: string;
  /** About the tiles as a whole: how many there are. */
  tiles?: string;
  /** About one tile, by its place. */
  tile?: Record<number, TileErrors>;
}

export type HomeValidation = { ok: true; data: HomeContent } | { ok: false; errors: HomeErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function texts(form: FormData, key: string): string[] {
  return form.getAll(key).map((value) => (typeof value === "string" ? value.trim() : ""));
}

function readTiles(form: FormData): { tiles: TileContent[]; problem?: string; errors: Record<number, TileErrors> } {
  const labels = texts(form, "tileLabel");
  const links = texts(form, "tileLink");
  const addresses = texts(form, "tileAddress");
  const photos = texts(form, "tilePhoto");
  const colours = texts(form, "tileColour");

  // Read in parallel, so one missing field would pair a tile's words with
  // the next tile's photo. Better refused than shuffled.
  if (![links, addresses, photos, colours].every((list) => list.length === labels.length)) {
    return { tiles: [], problem: "The tiles did not arrive whole. Reload the page and try again.", errors: {} };
  }

  const count = labels.length;
  if (count === 0 || count % TILES_PER_BLOCK !== 0 || count > MAX_BLOCKS * TILES_PER_BLOCK) {
    return {
      tiles: [],
      problem: `Tiles come in blocks of ${TILES_PER_BLOCK}: one block at least, ${MAX_BLOCKS} at most.`,
      errors: {},
    };
  }

  const tiles: TileContent[] = [];
  const errors: Record<number, TileErrors> = {};

  labels.forEach((label, index) => {
    const problems: TileErrors = {};

    if (label.length === 0) problems.label = "Give the tile its words.";
    else if (label.length > TILE_LABEL_MAX) {
      problems.label = `Keep it to ${TILE_LABEL_MAX} characters, so it fits on the photo.`;
    }

    const link = readLink(links[index], addresses[index]);
    if (!link.ok) problems.link = link.error;

    const photo = readPhoto(photos[index]);
    if (photo === undefined) problems.photo = "Choose the photo again.";
    else if (photo === null && link.ok && link.link.kind !== "category") {
      problems.photo = "Choose a photo. Only a tile leading to a category can take its first piece's.";
    }

    const words = colours[index] || DEFAULT_TILE_WORDS;
    if (!isTileWords(words)) problems.colour = "Choose one of the colours offered.";

    if (Object.keys(problems).length > 0) errors[index] = problems;
    else if (link.ok && photo !== undefined) tiles.push({ label, link: link.link, photo, words });
  });

  return { tiles, errors };
}

export function validateHomeInput(form: FormData): HomeValidation {
  const errors: HomeErrors = {};

  const bannerText = text(form, "bannerText");
  if (bannerText.length > BANNER_MAX) errors.bannerText = `Keep the banner to ${BANNER_MAX} characters.`;

  const bannerGround = text(form, "bannerGround");
  const bannerInk = text(form, "bannerInk");
  if (!readsOn(bannerGround, bannerInk)) errors.bannerColour = "Choose the banner's colours again: those words would not read on it.";

  const bandText = text(form, "bandText");
  if (bandText.length > BAND_MAX) errors.bandText = `Keep it to ${BAND_MAX} characters.`;

  const ctaLabel = text(form, "ctaLabel");
  if (ctaLabel.length === 0) errors.ctaLabel = "Say what the button should read.";
  else if (ctaLabel.length > BUTTON_MAX) errors.ctaLabel = `Keep the button to ${BUTTON_MAX} characters.`;

  const ctaLink = readLink(text(form, "ctaLink"), text(form, "ctaAddress"));
  if (!ctaLink.ok) errors.ctaLink = ctaLink.error;

  const tiles = readTiles(form);
  if (tiles.problem) errors.tiles = tiles.problem;
  if (Object.keys(tiles.errors).length > 0) errors.tile = tiles.errors;

  if (Object.keys(errors).length > 0 || !ctaLink.ok) return { ok: false, errors };

  return {
    ok: true,
    data: {
      showBadges: form.get("showBadges") === "on",
      bannerText,
      bannerGround,
      bannerInk,
      bandText,
      ctaLabel,
      ctaLink: ctaLink.link,
      tiles: tiles.tiles,
    },
  };
}

export interface ReferencedIds {
  categoryIds: string[];
  imageIds: string[];
  photoIds: string[];
}

/** Every category and photo the page points at, once each, to look up before saving. */
export function referencedIds(content: HomeContent): ReferencedIds {
  const categoryIds = new Set<string>();
  const imageIds = new Set<string>();
  const photoIds = new Set<string>();

  if (content.ctaLink.kind === "category") categoryIds.add(content.ctaLink.categoryId);
  for (const tile of content.tiles) {
    if (tile.link.kind === "category") categoryIds.add(tile.link.categoryId);
    if (tile.photo?.kind === "shop") imageIds.add(tile.photo.imageId);
    if (tile.photo?.kind === "upload") photoIds.add(tile.photo.photoId);
  }

  return { categoryIds: [...categoryIds], imageIds: [...imageIds], photoIds: [...photoIds] };
}

/**
 * What the page points at that is no longer there - deleted since the
 * editor was opened, or never there at all - named by where it was chosen.
 */
export function missingReferences(
  content: HomeContent,
  known: { categoryIds: ReadonlySet<string>; imageIds: ReadonlySet<string>; photoIds: ReadonlySet<string> },
): HomeErrors | null {
  const errors: HomeErrors = {};
  const gone = "That category is no longer there. Choose where it leads again.";

  if (content.ctaLink.kind === "category" && !known.categoryIds.has(content.ctaLink.categoryId)) {
    errors.ctaLink = gone;
  }

  content.tiles.forEach((tile, index) => {
    const problems: TileErrors = {};
    if (tile.link.kind === "category" && !known.categoryIds.has(tile.link.categoryId)) problems.link = gone;
    const photoGone =
      (tile.photo?.kind === "shop" && !known.imageIds.has(tile.photo.imageId)) ||
      (tile.photo?.kind === "upload" && !known.photoIds.has(tile.photo.photoId));
    if (photoGone) problems.photo = "That photo is no longer there. Choose another.";
    if (Object.keys(problems).length > 0) errors.tile = { ...errors.tile, [index]: problems };
  });

  return Object.keys(errors).length > 0 ? errors : null;
}

export interface HomePageRow {
  showBadges: boolean;
  bannerText: string;
  bannerGround: string;
  bannerInk: string;
  bandText: string;
  ctaLabel: string;
  ctaCategoryId: string | null;
  ctaHref: string | null;
}

export function pageToRow(page: HomePageContent): HomePageRow {
  const link = linkToRow(page.ctaLink);
  return {
    showBadges: page.showBadges,
    bannerText: page.bannerText,
    bannerGround: page.bannerGround,
    bannerInk: page.bannerInk,
    bandText: page.bandText,
    ctaLabel: page.ctaLabel,
    ctaCategoryId: link.categoryId,
    ctaHref: link.href,
  };
}

export function pageFromRow(row: HomePageRow): HomePageContent {
  return {
    showBadges: row.showBadges,
    bannerText: row.bannerText,
    bannerGround: row.bannerGround,
    bannerInk: row.bannerInk,
    bandText: row.bandText,
    ctaLabel: row.ctaLabel,
    ctaLink: linkFromRow({ categoryId: row.ctaCategoryId, href: row.ctaHref }),
  };
}

/** The first tile with a problem, to open in the editor. */
export function firstTileWithProblem(errors: HomeErrors): number | null {
  const indexes = Object.keys(errors.tile ?? {}).map(Number);
  return indexes.length > 0 ? Math.min(...indexes) : null;
}

