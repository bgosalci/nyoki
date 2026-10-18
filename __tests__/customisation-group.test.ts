import { customisationGroup } from "@/lib/customisation/group";

const categories = [
  { id: "cards", slug: "cards", parentId: null },
  { id: "birthday", slug: "birthday-card", parentId: "cards" },
  { id: "clothes", slug: "clothes", parentId: null },
  { id: "dresses", slug: "dresses", parentId: "clothes" },
  { id: "accessories", slug: "accessories", parentId: null },
  { id: "bookmarks", slug: "bookmarks", parentId: "accessories" },
  { id: "floral", slug: "floral-bookmarks", parentId: "bookmarks" },
];

describe("customisationGroup", () => {
  it("knows a card by the Cards group above its category", () => {
    expect(customisationGroup(["birthday"], categories)).toEqual({ one: "card", many: "cards" });
  });

  it("knows a card filed in the Cards group itself", () => {
    expect(customisationGroup(["cards"], categories)).toEqual({ one: "card", many: "cards" });
  });

  it("knows a bookmark by a Bookmarks category anywhere above it, even inside another group", () => {
    expect(customisationGroup(["floral"], categories)).toEqual({ one: "bookmark", many: "bookmarks" });
  });

  it("accepts the singular too, however the group ends up named", () => {
    const singular = [
      { id: "c", slug: "card", parentId: null },
      { id: "b", slug: "bookmark", parentId: null },
    ];

    expect(customisationGroup(["c"], singular)).toEqual({ one: "card", many: "cards" });
    expect(customisationGroup(["b"], singular)).toEqual({ one: "bookmark", many: "bookmarks" });
  });

  it("offers nothing to anything else", () => {
    expect(customisationGroup(["dresses"], categories)).toBeNull();
    expect(customisationGroup(["accessories"], categories)).toBeNull();
  });

  it("offers nothing to a piece in no category yet", () => {
    expect(customisationGroup([], categories)).toBeNull();
  });

  it("finds the card among several categories", () => {
    expect(customisationGroup(["dresses", "birthday"], categories)).toEqual({ one: "card", many: "cards" });
  });

  it("cannot be sent round in circles by a tree that loops", () => {
    const looped = [
      { id: "a", slug: "a", parentId: "b" },
      { id: "b", slug: "b", parentId: "a" },
    ];

    expect(customisationGroup(["a"], looped)).toBeNull();
  });

  it("ignores a category it has not been told about", () => {
    expect(customisationGroup(["gone"], categories)).toBeNull();
  });
});
