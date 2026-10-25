import { isClothes } from "@/lib/clothes/group";

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
