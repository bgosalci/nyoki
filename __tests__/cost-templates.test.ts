import { templatesFor } from "@/lib/costing/templates";

const card = { label: "Card & envelope", unitPence: 22, quantityHundredths: 100 };
const bag = { label: "Bag", unitPence: 5, quantityHundredths: 100 };
const yarn = { label: "Bamboo yarn", unitPence: 450, quantityHundredths: 250 };

const categories = [
  { id: "cards", name: "Cards", parentId: null, lines: [card, bag] },
  { id: "christmas", name: "Christmas Cards", parentId: "cards", lines: [] },
  { id: "easter", name: "Easter Card", parentId: "cards", lines: [card] },
  { id: "clothes", name: "Clothes", parentId: null, lines: [yarn] },
  { id: "cardigans", name: "Cardigans", parentId: "clothes", lines: [] },
  { id: "accessories", name: "Accessories", parentId: null, lines: [] },
];

describe("templatesFor", () => {
  it("offers the usual costs of the group a piece's type sits under", () => {
    expect(templatesFor(["christmas"], categories)).toEqual([{ categoryId: "cards", categoryName: "Cards", lines: [card, bag] }]);
  });

  it("prefers a type's own usual costs to its group's", () => {
    expect(templatesFor(["easter"], categories)).toEqual([{ categoryId: "easter", categoryName: "Easter Card", lines: [card] }]);
  });

  it("offers each set once, for a piece in several places", () => {
    expect(templatesFor(["christmas", "cards", "cardigans"], categories).map((t) => t.categoryId)).toEqual(["cards", "clothes"]);
  });

  it("offers nothing where no category up the tree has usual costs", () => {
    expect(templatesFor(["accessories"], categories)).toEqual([]);
    expect(templatesFor([], categories)).toEqual([]);
    expect(templatesFor(["gone"], categories)).toEqual([]);
  });

  it("cannot be sent round in circles by a tree that loops", () => {
    const looped = [
      { id: "a", name: "A", parentId: "b", lines: [] },
      { id: "b", name: "B", parentId: "a", lines: [] },
    ];
    expect(templatesFor(["a"], looped)).toEqual([]);
  });
});
