import {
  BANNER_MAX,
  HOME_DEFAULTS,
  missingReferences,
  pageFromRow,
  pageToRow,
  referencedIds,
  validateHomeInput,
  type HomeContent,
} from "@/lib/home/content";
import { TILE_LABEL_MAX } from "@/lib/home/tiles";

interface TileFields {
  label: string;
  link: string;
  address?: string;
  photo?: string;
}

const tile = (label: string, overrides: Partial<TileFields> = {}): TileFields => ({
  label,
  link: "category:c1",
  address: "",
  photo: "",
  ...overrides,
});

const fiveTiles = (): TileFields[] => ["For Christmas", "For love", "For birthdays", "For Dad", "For anniversaries"].map((label) => tile(label));

function form(fields: Record<string, string>, tiles: TileFields[] = fiveTiles()): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  for (const entry of tiles) {
    data.append("tileLabel", entry.label);
    data.append("tileLink", entry.link);
    data.append("tileAddress", entry.address ?? "");
    data.append("tilePhoto", entry.photo ?? "");
  }
  return data;
}

const filled = {
  showBadges: "on",
  bannerText: "  Start with who you’re thinking of  ",
  bandText: "Our most-loved handmade pieces.",
  ctaLabel: "See everything",
  ctaLink: "page:/shop",
  ctaAddress: "",
};

describe("HOME_DEFAULTS", () => {
  it("is a complete page in its own right, so a shop that has never edited it still reads", () => {
    expect(HOME_DEFAULTS.showBadges).toBe(true);
    expect(HOME_DEFAULTS.bannerText.length).toBeGreaterThan(0);
    expect(HOME_DEFAULTS.bandText.length).toBeGreaterThan(0);
    expect(HOME_DEFAULTS.ctaLabel.length).toBeGreaterThan(0);
    expect(HOME_DEFAULTS.ctaLink).toEqual({ kind: "address", href: "/shop" });
  });
});

describe("validateHomeInput", () => {
  it("takes the whole page and trims what was typed", () => {
    const result = validateHomeInput(form(filled));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      showBadges: true,
      bannerText: "Start with who you’re thinking of",
      bandText: "Our most-loved handmade pieces.",
      ctaLabel: "See everything",
      ctaLink: { kind: "address", href: "/shop" },
    });
    expect(result.data.tiles).toHaveLength(5);
    expect(result.data.tiles[0]).toEqual({
      label: "For Christmas",
      link: { kind: "category", categoryId: "c1" },
      photo: null,
    });
  });

  it("takes the badges off when the box is not ticked", () => {
    const { showBadges, ...rest } = filled;
    void showBadges;
    const result = validateHomeInput(form(rest));

    expect(result.ok === true && result.data.showBadges).toBe(false);
  });

  it("lets the banner be emptied, which takes it off the page", () => {
    const result = validateHomeInput(form({ ...filled, bannerText: "   " }));

    expect(result.ok === true && result.data.bannerText).toBe("");
  });

  it("keeps the banner short enough to stand as a heading", () => {
    const result = validateHomeInput(form({ ...filled, bannerText: "x".repeat(BANNER_MAX + 1) }));

    expect(result.ok === false && result.errors.bannerText).toBeTruthy();
  });

  it("lets the band above the pieces be emptied too", () => {
    const result = validateHomeInput(form({ ...filled, bandText: "" }));

    expect(result.ok === true && result.data.bandText).toBe("");
  });

  it("insists on words for the button, since a blank one cannot be clicked knowingly", () => {
    const result = validateHomeInput(form({ ...filled, ctaLabel: "  " }));

    expect(result.ok === false && result.errors.ctaLabel).toBeTruthy();
  });

  it("sends the button wherever it is pointed", () => {
    const result = validateHomeInput(form({ ...filled, ctaLink: "category:c9" }));

    expect(result.ok === true && result.data.ctaLink).toEqual({ kind: "category", categoryId: "c9" });
  });

  it("says what is wrong with an address the button cannot go to", () => {
    const result = validateHomeInput(form({ ...filled, ctaLink: "other", ctaAddress: "shop/cards" }));

    expect(result.ok === false && result.errors.ctaLink).toBeTruthy();
  });

  it("takes a tile's photo, chosen from the shop's or uploaded", () => {
    const tiles = fiveTiles();
    tiles[0].photo = "image:i1";
    tiles[1].photo = "upload:u1";

    const result = validateHomeInput(form(filled, tiles));

    expect(result.ok === true && result.data.tiles.slice(0, 2).map((entry) => entry.photo)).toEqual([
      { kind: "shop", imageId: "i1" },
      { kind: "upload", photoId: "u1" },
    ]);
  });

  it("insists on words for every tile, and says which tile", () => {
    const tiles = fiveTiles();
    tiles[2].label = "  ";

    const result = validateHomeInput(form(filled, tiles));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.tile?.[2]?.label).toBeTruthy();
    expect(result.errors.tile?.[0]).toBeUndefined();
  });

  it("keeps a tile's words short enough to sit on its photo", () => {
    const tiles = fiveTiles();
    tiles[1].label = "x".repeat(TILE_LABEL_MAX + 1);

    const result = validateHomeInput(form(filled, tiles));

    expect(result.ok === false && result.errors.tile?.[1]?.label).toBeTruthy();
  });

  it("sends a tile to an address typed in", () => {
    const tiles = fiveTiles();
    tiles[4] = tile("Just because", { link: "other", address: "/product/let-it-snow", photo: "image:i4" });

    const result = validateHomeInput(form(filled, tiles));

    expect(result.ok === true && result.data.tiles[4].link).toEqual({ kind: "address", href: "/product/let-it-snow" });
  });

  it("says what is wrong with a tile's address", () => {
    const tiles = fiveTiles();
    tiles[3] = tile("For Dad", { link: "other", address: "javascript:alert(1)", photo: "image:i3" });

    const result = validateHomeInput(form(filled, tiles));

    expect(result.ok === false && result.errors.tile?.[3]?.link).toBeTruthy();
  });

  it("asks for a photo for a tile leading anywhere but a category, which has no first piece to lend one", () => {
    const tiles = fiveTiles();
    tiles[0] = tile("For Christmas", { link: "page:/about", photo: "" });

    const result = validateHomeInput(form(filled, tiles));

    expect(result.ok === false && result.errors.tile?.[0]?.photo).toBeTruthy();
  });

  it("takes tiles only in whole blocks of five, which is what the mosaic is made of", () => {
    const result = validateHomeInput(form(filled, fiveTiles().slice(0, 4)));

    expect(result.ok === false && result.errors.tiles).toBeTruthy();
  });

  it("takes up to four blocks", () => {
    const twenty = Array.from({ length: 4 }, fiveTiles).flat();
    const result = validateHomeInput(form(filled, [...twenty, ...fiveTiles()]));

    expect(validateHomeInput(form(filled, twenty)).ok).toBe(true);
    expect(result.ok === false && result.errors.tiles).toBeTruthy();
  });

  it("refuses tiles that did not arrive whole, rather than pair one tile's words with another's photo", () => {
    const data = form(filled);
    data.append("tileLabel", "A sixth label with nothing else");

    const result = validateHomeInput(data);

    expect(result.ok === false && result.errors.tiles).toBeTruthy();
  });

  it("refuses a photo it cannot read", () => {
    const tiles = fiveTiles();
    tiles[0].photo = "somewhere:else";

    const result = validateHomeInput(form(filled, tiles));

    expect(result.ok === false && result.errors.tile?.[0]?.photo).toBeTruthy();
  });
});

describe("references", () => {
  const content: HomeContent = {
    ...HOME_DEFAULTS,
    ctaLink: { kind: "category", categoryId: "c-button" },
    tiles: [
      { label: "A", link: { kind: "category", categoryId: "c1" }, photo: { kind: "shop", imageId: "i1" } },
      { label: "B", link: { kind: "address", href: "/about" }, photo: { kind: "upload", photoId: "u1" } },
      { label: "C", link: { kind: "category", categoryId: "c1" }, photo: null },
      { label: "D", link: { kind: "category", categoryId: "c2" }, photo: null },
      { label: "E", link: { kind: "category", categoryId: "c2" }, photo: null },
    ],
  };

  it("lists every category and photo the page points at, once each", () => {
    expect(referencedIds(content)).toEqual({
      categoryIds: ["c-button", "c1", "c2"],
      imageIds: ["i1"],
      photoIds: ["u1"],
    });
  });

  it("finds nothing missing when everything is there", () => {
    expect(
      missingReferences(content, {
        categoryIds: new Set(["c-button", "c1", "c2"]),
        imageIds: new Set(["i1"]),
        photoIds: new Set(["u1"]),
      }),
    ).toBeNull();
  });

  it("names the tile whose category or photo has gone since the page was opened", () => {
    const errors = missingReferences(content, {
      categoryIds: new Set(["c-button", "c1"]),
      imageIds: new Set(),
      photoIds: new Set(["u1"]),
    });

    expect(errors?.tile?.[0]?.photo).toBeTruthy();
    expect(errors?.tile?.[3]?.link).toBeTruthy();
    expect(errors?.tile?.[1]).toBeUndefined();
  });

  it("names the button when its category has gone", () => {
    const errors = missingReferences(content, {
      categoryIds: new Set(["c1", "c2"]),
      imageIds: new Set(["i1"]),
      photoIds: new Set(["u1"]),
    });

    expect(errors?.ctaLink).toBeTruthy();
  });
});

describe("storing the page", () => {
  it("goes back and forth", () => {
    const page = { ...HOME_DEFAULTS, ctaLink: { kind: "category" as const, categoryId: "c1" } };

    expect(pageFromRow(pageToRow(page))).toEqual(page);
  });

  it("sends the button to the whole shop once its category has been deleted", () => {
    const row = { ...pageToRow(HOME_DEFAULTS), ctaCategoryId: null, ctaHref: null };

    expect(pageFromRow(row).ctaLink).toEqual({ kind: "address", href: "/shop" });
  });
});
