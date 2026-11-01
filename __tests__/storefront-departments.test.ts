import { stockedDepartments } from "@/lib/storefront/departments";

// In CATEGORY_ORDER, as the query returns them: each group's types follow
// the order they were dragged into, wherever they sit in the list.
const categories = [
  { id: "christmas", slug: "christmas", name: "CHRISTMAS", labelColour: "nyoki-red", parentId: null },
  { id: "cards", slug: "cards", name: "Cards", labelColour: "nyoki-navy", parentId: null },
  { id: "christmas-cards", slug: "christmas-cards", name: "Cards", labelColour: "nyoki-ink", parentId: "christmas" },
  { id: "birthday", slug: "birthday", name: "Birthday Card", labelColour: "nyoki-navy", parentId: "cards" },
  { id: "easter", slug: "easter", name: "Easter Card", labelColour: "nyoki-navy", parentId: "cards" },
  { id: "packs", slug: "pack-of-cards", name: "Pack Of Cards", labelColour: "nyoki-navy", parentId: "cards" },
  { id: "pack-of-two", slug: "pack-of-two", name: "Pack Of Two", labelColour: "nyoki-navy", parentId: "packs" },
  { id: "gifts", slug: "gifts", name: "Gifts", labelColour: "nyoki-navy", parentId: "christmas" },
  { id: "clothing", slug: "clothing", name: "Clothing", labelColour: "nyoki-navy", parentId: null },
  { id: "baby", slug: "baby-clothing", name: "Baby Clothing", labelColour: "nyoki-navy", parentId: "clothing" },
  { id: "tableware", slug: "tableware", name: "Tableware", labelColour: "nyoki-navy", parentId: null },
];

const names = (groups: ReturnType<typeof stockedDepartments>) =>
  groups.map((group) => [group.name, group.children.map((child) => child.name)]);

describe("stockedDepartments", () => {
  it("leaves out a department with nothing on the shop anywhere in it", () => {
    const groups = stockedDepartments(categories, ["birthday"]);

    expect(groups.map((group) => group.slug)).toEqual(["cards"]);
  });

  it("leaves out a type with nothing in it, and keeps the ones that have, in their order", () => {
    const groups = stockedDepartments(categories, ["gifts", "christmas-cards", "birthday"]);

    expect(names(groups)).toEqual([
      ["CHRISTMAS", ["Cards", "Gifts"]],
      ["Cards", ["Birthday Card"]],
    ]);
  });

  it("keeps a type whose pieces are all filed in a type beneath it, and the department above", () => {
    const groups = stockedDepartments(categories, ["pack-of-two"]);

    expect(names(groups)).toEqual([["Cards", ["Pack Of Cards"]]]);
  });

  it("keeps a department whose pieces are filed on it directly, with none of its types", () => {
    const groups = stockedDepartments(categories, ["clothing"]);

    expect(names(groups)).toEqual([["Clothing", []]]);
  });

  it("carries each name's web address and colour", () => {
    const [christmas] = stockedDepartments(categories, ["christmas-cards"]);

    expect(christmas).toEqual({
      slug: "christmas",
      name: "CHRISTMAS",
      labelColour: "nyoki-red",
      children: [{ slug: "christmas-cards", name: "Cards", labelColour: "nyoki-ink" }],
    });
  });

  it("caps the types after leaving out the empty ones, so the few shown all lead somewhere", () => {
    const groups = stockedDepartments(categories, ["birthday", "pack-of-two"], 1);

    expect(names(groups)).toEqual([["Cards", ["Birthday Card"]]]);
    expect(names(stockedDepartments(categories, ["pack-of-two", "easter"], 1))).toEqual([["Cards", ["Easter Card"]]]);
  });

  it("shows nothing when nothing is on the shop", () => {
    expect(stockedDepartments(categories, [])).toEqual([]);
  });

  it("ignores a piece filed in a category that is no longer there", () => {
    expect(stockedDepartments(categories, ["gone"])).toEqual([]);
  });

  it("does not hang on a tree that loops", () => {
    const looped = [
      { id: "a", slug: "a", name: "A", labelColour: "nyoki-navy", parentId: "b" },
      { id: "b", slug: "b", name: "B", labelColour: "nyoki-navy", parentId: "a" },
      { id: "top", slug: "top", name: "Top", labelColour: "nyoki-navy", parentId: null },
    ];

    expect(stockedDepartments(looped, ["a"])).toEqual([]);
  });
});
