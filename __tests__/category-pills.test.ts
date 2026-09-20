import { chainTo, pillRows, subtreeIds } from "@/lib/products/category-pills";

// Cards -> Birthday Card, Christmas Cards ; Clothes -> Girls Vest -> Summer Vests ; Tableware (no children)
const categories = [
  { id: "cards", slug: "cards", name: "Cards", parentId: null },
  { id: "birthday", slug: "birthday-card", name: "Birthday Card", parentId: "cards" },
  { id: "christmas", slug: "christmas-cards", name: "Christmas Cards", parentId: "cards" },
  { id: "clothes", slug: "clothes", name: "Clothes", parentId: null },
  { id: "vest", slug: "girls-vest", name: "Girls Vest", parentId: "clothes" },
  { id: "summer", slug: "summer-vests", name: "Summer Vests", parentId: "vest" },
  { id: "tableware", slug: "tableware", name: "Tableware", parentId: null },
];

describe("chainTo", () => {
  it("walks from the top-level group down to the selected category", () => {
    expect(chainTo(categories, "summer-vests").map((c) => c.slug)).toEqual(["clothes", "girls-vest", "summer-vests"]);
  });

  it("is just the group when a group is selected", () => {
    expect(chainTo(categories, "cards").map((c) => c.slug)).toEqual(["cards"]);
  });

  it("is empty for nothing selected or an unknown slug", () => {
    expect(chainTo(categories, null)).toEqual([]);
    expect(chainTo(categories, "no-such")).toEqual([]);
  });
});

describe("pillRows", () => {
  it("shows only the groups when nothing is selected", () => {
    const rows = pillRows(categories, null);

    expect(rows).toHaveLength(1);
    expect(rows[0].items.map((c) => c.slug)).toEqual(["cards", "clothes", "tableware"]);
    expect(rows[0].activeSlug).toBeNull();
  });

  it("adds the group's types as a second row when a group is picked", () => {
    const rows = pillRows(categories, "cards");

    expect(rows).toHaveLength(2);
    expect(rows[0].activeSlug).toBe("cards");
    expect(rows[1].items.map((c) => c.slug)).toEqual(["birthday-card", "christmas-cards"]);
    expect(rows[1].activeSlug).toBeNull();
  });

  it("keeps the siblings visible and marks the chosen type when a type is picked", () => {
    const rows = pillRows(categories, "birthday-card");

    expect(rows).toHaveLength(2);
    expect(rows[0].activeSlug).toBe("cards");
    expect(rows[1].items.map((c) => c.slug)).toEqual(["birthday-card", "christmas-cards"]);
    expect(rows[1].activeSlug).toBe("birthday-card");
  });

  it("goes as deep as the tree does", () => {
    const rows = pillRows(categories, "summer-vests");

    expect(rows.map((r) => r.activeSlug)).toEqual(["clothes", "girls-vest", "summer-vests"]);
    expect(rows[2].items.map((c) => c.slug)).toEqual(["summer-vests"]);
  });

  it("adds no row for a group with nothing beneath it", () => {
    expect(pillRows(categories, "tableware")).toHaveLength(1);
  });

  it("treats an unknown slug as nothing selected", () => {
    expect(pillRows(categories, "no-such")).toEqual(pillRows(categories, null));
  });
});

describe("subtreeIds", () => {
  it("is the category and everything beneath it", () => {
    expect(subtreeIds(categories, "clothes").sort()).toEqual(["clothes", "summer", "vest"]);
  });

  it("is just the category for a leaf", () => {
    expect(subtreeIds(categories, "birthday")).toEqual(["birthday"]);
  });
});
