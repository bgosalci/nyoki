import {
  blocksOf,
  DEFAULT_TILES,
  defaultTiles,
  photoChoice,
  readPhoto,
  shownTiles,
  tileFromRow,
  tileToRow,
  TILES_PER_BLOCK,
  type LoadedTile,
} from "@/lib/home/tiles";

describe("DEFAULT_TILES", () => {
  it("fills two whole blocks, so a shop that has never edited the page still has its mosaic", () => {
    expect(DEFAULT_TILES).toHaveLength(2 * TILES_PER_BLOCK);
    for (const tile of DEFAULT_TILES) {
      expect(tile.label.length).toBeGreaterThan(0);
      expect(tile.categorySlug.length).toBeGreaterThan(0);
    }
  });

  it("opens with Christmas, large", () => {
    expect(DEFAULT_TILES[0].label).toBe("For Christmas");
  });
});

describe("defaultTiles", () => {
  const found = {
    categories: [{ id: "c-xmas", slug: DEFAULT_TILES[0].categorySlug }],
    images: [
      {
        id: "i-snow",
        url: "/snow.jpg",
        productSlug: DEFAULT_TILES[0].photo.productSlug,
        position: DEFAULT_TILES[0].photo.position,
      },
    ],
  };

  it("finds each tile's category and photo by their addresses", () => {
    const [first] = defaultTiles(found);

    expect(first).toEqual({
      label: "For Christmas",
      link: { kind: "category", categoryId: "c-xmas" },
      photo: { kind: "shop", imageId: "i-snow" },
      photoUrl: "/snow.jpg",
      words: "nyoki-white",
    });
  });

  it("leads to the whole shop where the category is not there, and lets the photo go automatic", () => {
    const [, second] = defaultTiles(found);

    expect(second.link).toEqual({ kind: "address", href: "/shop" });
    expect(second.photo).toBeNull();
    expect(second.photoUrl).toBeNull();
  });

  it("only takes the photo in the place named, not another of the same piece's", () => {
    const [first] = defaultTiles({
      ...found,
      images: [{ ...found.images[0], position: DEFAULT_TILES[0].photo.position + 1 }],
    });

    expect(first.photo).toBeNull();
  });
});

describe("photoChoice and readPhoto", () => {
  it("go back and forth", () => {
    for (const photo of [null, { kind: "shop", imageId: "i1" }, { kind: "upload", photoId: "u1" }] as const) {
      expect(readPhoto(photoChoice(photo))).toEqual(photo);
    }
  });

  it("read nothing as automatic", () => {
    expect(readPhoto("")).toBeNull();
  });

  it("refuse anything else, rather than guess", () => {
    expect(readPhoto("elsewhere:x")).toBeUndefined();
    expect(readPhoto("image:")).toBeUndefined();
  });
});

describe("blocksOf", () => {
  it("cuts the tiles into fives: a large tile and four small", () => {
    const tiles = Array.from({ length: 10 }, (_, index) => index);

    expect(blocksOf(tiles)).toEqual([
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
    ]);
  });
});

describe("storing a tile", () => {
  const row = {
    label: "For love",
    categoryId: "c1",
    href: null,
    productImageId: "i1",
    photoId: null,
    productImage: { url: "/love.jpg" },
    photo: null,
    wordColour: "nyoki-navy",
  };

  it("reads a tile with one of the shop's photos", () => {
    expect(tileFromRow(row)).toEqual({
      label: "For love",
      link: { kind: "category", categoryId: "c1" },
      photo: { kind: "shop", imageId: "i1" },
      photoUrl: "/love.jpg",
      words: "nyoki-navy",
    });
  });

  it("reads a tile with a photo uploaded for it", () => {
    expect(
      tileFromRow({ ...row, productImageId: null, productImage: null, photoId: "u1", photo: { url: "/uploads/home/u1.jpg" } }),
    ).toMatchObject({ photo: { kind: "upload", photoId: "u1" }, photoUrl: "/uploads/home/u1.jpg" });
  });

  it("reads a tile whose photo has since been deleted as automatic", () => {
    // The photo is SetNull on delete; the category lends its own.
    expect(tileFromRow({ ...row, productImageId: null, productImage: null })).toMatchObject({ photo: null, photoUrl: null });
  });

  it("writes a tile in its place", () => {
    expect(tileToRow(tileFromRow(row), 3)).toEqual({
      position: 3,
      label: "For love",
      categoryId: "c1",
      href: null,
      productImageId: "i1",
      photoId: null,
      wordColour: "nyoki-navy",
    });
  });
});

describe("shownTiles", () => {
  const slugs = new Map([["c1", "valentine-cards"]]);
  const leads = new Map([["c1", { url: "/first-valentine.jpg" }]]);

  const tile = (overrides: Partial<LoadedTile>): LoadedTile => ({
    label: "For love",
    link: { kind: "category", categoryId: "c1" },
    photo: null,
    photoUrl: null,
    words: "nyoki-white",
    ...overrides,
  });

  it("shows the photo chosen for it", () => {
    const [shown] = shownTiles([tile({ photo: { kind: "shop", imageId: "i1" }, photoUrl: "/chosen.jpg" })], slugs, leads);

    expect(shown).toEqual({ label: "For love", href: "/shop/valentine-cards", image: { url: "/chosen.jpg" }, words: "nyoki-white" });
  });

  it("takes the first piece's photo from the category it leads to when none is chosen", () => {
    const [shown] = shownTiles([tile({})], slugs, leads);

    expect(shown.image).toEqual({ url: "/first-valentine.jpg" });
  });

  it("shows no photo, rather than a broken one, when there is none to be had", () => {
    const [shown] = shownTiles([tile({ link: { kind: "address", href: "/about" } })], slugs, leads);

    expect(shown).toEqual({ label: "For love", href: "/about", image: null, words: "nyoki-white" });
  });
});
