import { ALSO_LIKE_LIMIT, alsoLike, closestFirst, parseAlsoLikeIds } from "@/lib/products/also-like";

const piece = (id: string) => ({ id, name: id });

describe("alsoLike", () => {
  it("shows Njomza's choices first, in her order", () => {
    const shown = alsoLike({ chosen: [piece("stars"), piece("tree")], automatic: [piece("a"), piece("b"), piece("c")] });

    expect(shown.map((p) => p.id)).toEqual(["stars", "tree", "a", "b"]);
  });

  it("fills what she has not chosen automatically, so the row is never short", () => {
    expect(alsoLike({ chosen: [], automatic: [piece("a"), piece("b"), piece("c"), piece("d"), piece("e")] }).map((p) => p.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("shows only her choices when she has chosen all four", () => {
    const chosen = ["w", "x", "y", "z"].map(piece);

    expect(alsoLike({ chosen, automatic: [piece("a")] }).map((p) => p.id)).toEqual(["w", "x", "y", "z"]);
  });

  it("does not show a piece twice when she chose one the automatic list also found", () => {
    expect(alsoLike({ chosen: [piece("b")], automatic: [piece("a"), piece("b"), piece("c")] }).map((p) => p.id)).toEqual(["b", "a", "c"]);
  });

  it("shows four at most", () => {
    expect(ALSO_LIKE_LIMIT).toBe(4);
  });
});

describe("parseAlsoLikeIds", () => {
  const form = (...ids: string[]) => {
    const data = new FormData();
    for (const id of ids) data.append("alsoLikeIds", id);
    return data;
  };

  it("reads the chosen pieces in the order posted", () => {
    expect(parseAlsoLikeIds(form("stars", "tree"), "self")).toEqual({ ok: true, ids: ["stars", "tree"] });
  });

  it("drops a piece given twice, blank entries, and the product itself", () => {
    expect(parseAlsoLikeIds(form("stars", "", "stars", "self", "tree"), "self")).toEqual({ ok: true, ids: ["stars", "tree"] });
  });

  it("refuses more than four", () => {
    expect(parseAlsoLikeIds(form("a", "b", "c", "d", "e"), null)).toEqual({ ok: false, error: "Choose at most 4 pieces." });
  });

  it("reads nothing chosen as automatic", () => {
    expect(parseAlsoLikeIds(new FormData(), null)).toEqual({ ok: true, ids: [] });
  });
});

describe("closestFirst, the order a replacement is offered in", () => {
  // Cards > Christmas Cards, Birthday Cards; Clothes > Cardigans.
  const categories = [
    { id: "cards", parentId: null },
    { id: "christmas", parentId: "cards" },
    { id: "birthday", parentId: "cards" },
    { id: "clothes", parentId: null },
    { id: "cardigans", parentId: "clothes" },
  ];
  const piece = (name: string, ...categoryIds: string[]) => ({ id: name, name, categoryIds });
  // As the page sends them: by name.
  const pieces = [
    piece("Bamboo Cardigan", "cardigans"),
    piece("Birthday Balloons", "birthday"),
    piece("Bud Vase"),
    piece("Snowflake Card", "christmas"),
    piece("Thank You Card", "cards"),
    piece("Three Stars", "christmas"),
  ];
  const names = (ranked: { name: string }[]) => ranked.map((p) => p.name);

  it("puts pieces from the same category first, then the rest of its group, then everything else", () => {
    expect(names(closestFirst(pieces, ["christmas"], categories))).toEqual([
      "Snowflake Card",
      "Three Stars",
      "Birthday Balloons",
      "Thank You Card",
      "Bamboo Cardigan",
      "Bud Vase",
    ]);
  });

  it("counts a piece in any of the product's categories as the same category", () => {
    expect(names(closestFirst(pieces, ["birthday", "cardigans"], categories)).slice(0, 2)).toEqual(["Bamboo Cardigan", "Birthday Balloons"]);
  });

  it("leaves the order alone for a product in no category", () => {
    expect(names(closestFirst(pieces, [], categories))).toEqual(names(pieces));
  });

  it("cannot hang on a tree that loops", () => {
    const looped = [
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
    ];
    expect(names(closestFirst([piece("X", "b"), piece("Y")], ["a"], looped))).toEqual(["X", "Y"]);
  });
});
