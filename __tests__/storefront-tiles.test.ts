import { categoryTiles } from "@/lib/storefront/tiles";

const categories = [
  { id: "cards", slug: "cards", name: "Cards", parentId: null },
  { id: "birthday", slug: "birthday", name: "Birthday Card", parentId: "cards" },
  { id: "christmas", slug: "christmas", name: "Christmas Cards", parentId: "cards" },
  { id: "milestone", slug: "milestone", name: "Milestone", parentId: "birthday" },
  { id: "clothes", slug: "clothes", name: "Clothes", parentId: null },
];

const photo = (url: string) => ({ url, alt: null });

// Newest first, the order the storefront queries return.
const products = [
  { categoryIds: ["christmas"], image: null },
  { categoryIds: ["milestone"], image: photo("/milestone.jpg") },
  { categoryIds: ["birthday", "cards"], image: photo("/birthday.jpg") },
  { categoryIds: ["clothes"], image: photo("/cardigan.jpg") },
];

describe("categoryTiles", () => {
  it("makes one tile per child, in the order the categories were given", () => {
    expect(categoryTiles(categories, null, products).map((tile) => tile.slug)).toEqual(["cards", "clothes"]);
  });

  it("counts everything beneath a child, not only what links to it directly", () => {
    const [cards] = categoryTiles(categories, null, products);

    // A christmas card, a milestone card, and one linked to birthday.
    expect(cards.count).toBe(3);
  });

  it("counts a product linked to both a group and its type only once", () => {
    const [cards] = categoryTiles(categories, null, [{ categoryIds: ["birthday", "cards"], image: null }]);

    expect(cards.count).toBe(1);
  });

  it("covers a tile with the newest photo it can find beneath it", () => {
    const [cards] = categoryTiles(categories, null, products);

    // The christmas card is newer but has no photo, so the milestone one covers it.
    expect(cards.image).toEqual(photo("/milestone.jpg"));
  });

  it("leaves a tile uncovered rather than borrowing a photo from elsewhere", () => {
    const tiles = categoryTiles(categories, "cards", [{ categoryIds: ["christmas"], image: null }]);

    expect(tiles).toEqual([{ slug: "christmas", name: "Christmas Cards", count: 1, image: null }]);
  });

  it("drops a child with nothing in it, which would be a dead end", () => {
    expect(categoryTiles(categories, null, [{ categoryIds: ["clothes"], image: null }]).map((t) => t.slug)).toEqual([
      "clothes",
    ]);
  });

  it("returns nothing for a category with no children at all", () => {
    expect(categoryTiles(categories, "clothes", products)).toEqual([]);
  });
});
