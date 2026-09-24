import { categoryPaths, pathsOf } from "@/lib/categories/path";

describe("categoryPaths", () => {
  it("gives each category its place in the tree, group first", () => {
    const paths = categoryPaths([
      { id: "cards", name: "Cards", parentId: null },
      { id: "christmas", name: "Christmas Cards", parentId: "cards" },
      { id: "advent", name: "Advent", parentId: "christmas" },
    ]);

    expect(paths.get("cards")).toBe("Cards");
    expect(paths.get("christmas")).toBe("Cards › Christmas Cards");
    expect(paths.get("advent")).toBe("Cards › Christmas Cards › Advent");
  });

  it("cannot be sent round in circles by a tree that loops", () => {
    const paths = categoryPaths([
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ]);

    expect(paths.get("a")).toBe("B › A");
  });
});

describe("pathsOf", () => {
  it("names a product's categories by their places, in order, skipping any since deleted", () => {
    const paths = categoryPaths([
      { id: "cards", name: "Cards", parentId: null },
      { id: "christmas", name: "Christmas Cards", parentId: "cards" },
      { id: "easter", name: "Easter Card", parentId: "cards" },
    ]);

    expect(pathsOf(["easter", "christmas", "gone"], paths)).toEqual(["Cards › Christmas Cards", "Cards › Easter Card"]);
  });
});
