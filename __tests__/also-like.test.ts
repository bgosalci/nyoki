import { ALSO_LIKE_LIMIT, alsoLike, parseAlsoLikeIds } from "@/lib/products/also-like";

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
