import { isClothes, offeredAxes, stockByVariant } from "@/lib/clothes/group";

const categories = [
  { id: "clothes", slug: "clothes", parentId: null },
  { id: "dresses", slug: "dresses", parentId: "clothes" },
  { id: "party", slug: "party-dresses", parentId: "dresses" },
  { id: "cards", slug: "cards", parentId: null },
  { id: "a", slug: "loop-a", parentId: "b" },
  { id: "b", slug: "loop-b", parentId: "a" },
];

describe("isClothes", () => {
  it("knows a piece filed under Clothes, itself or any type beneath it, however deep", () => {
    expect(isClothes(["clothes"], categories)).toBe(true);
    expect(isClothes(["dresses"], categories)).toBe(true);
    expect(isClothes(["party"], categories)).toBe(true);
  });

  it("knows it by any one of its categories", () => {
    expect(isClothes(["cards", "dresses"], categories)).toBe(true);
  });

  it("answers to Clothing as well, should the group be renamed", () => {
    expect(isClothes(["c"], [{ id: "c", slug: "clothing", parentId: null }])).toBe(true);
  });

  it("is not anything else, nor a piece in no category", () => {
    expect(isClothes(["cards"], categories)).toBe(false);
    expect(isClothes([], categories)).toBe(false);
    expect(isClothes(["gone"], categories)).toBe(false);
  });

  it("does not hang on a tree that loops", () => {
    expect(isClothes(["a"], categories)).toBe(false);
  });
});

describe("offeredAxes", () => {
  const coat = { colours: ["Lupin", "Gypsum"], sizes: ["2-3 years", "3-4 years"] };

  it("offers clothing's colours and sizes", () => {
    expect(offeredAxes(coat, true)).toEqual(coat);
  });

  it("offers anything else's colours alone: sizes are clothing's", () => {
    expect(offeredAxes(coat, false)).toEqual({ colours: ["Lupin", "Gypsum"], sizes: [] });
  });

  it("keeps whatever else the piece carries", () => {
    expect(offeredAxes({ ...coat, stock: 3 }, false)).toMatchObject({ stock: 3 });
  });
});

describe("stockByVariant", () => {
  it("keeps the stock of a piece in colours per colour, whatever it is", () => {
    expect(stockByVariant({ colours: ["Pink", "Cream"], sizes: [] }, false)).toBe(true);
    expect(stockByVariant({ colours: ["Pink"], sizes: [] }, true)).toBe(true);
  });

  it("keeps clothing's stock per size", () => {
    expect(stockByVariant({ colours: [], sizes: ["S"] }, true)).toBe(true);
  });

  it("keeps it in the Stock box for a piece in neither, or in sizes it no longer offers", () => {
    expect(stockByVariant({ colours: [], sizes: [] }, true)).toBe(false);
    expect(stockByVariant({ colours: [], sizes: ["1-2 years"] }, false)).toBe(false);
  });
});
