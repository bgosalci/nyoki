/**
 * @jest-environment node
 */
const findMany = jest.fn();
const findCategories = jest.fn();
const findLinks = jest.fn();

// jest.mock() does not go through the @/ alias, so this is relative.
jest.mock("../src/lib/db", () => ({
  db: {
    product: { findMany: (args: unknown) => findMany(args) },
    category: { findMany: (args: unknown) => findCategories(args) },
    categoryProduct: { findMany: (args: unknown) => findLinks(args) },
  },
}));

import { CATEGORY_ORDER } from "@/lib/categories/ordering";
import { activeProducts, departments, shopCategories, tileProducts } from "@/lib/storefront/queries";

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([]);
  findCategories.mockReset().mockResolvedValue([]);
  findLinks.mockReset().mockResolvedValue([]);
});

describe("the shop's order", () => {
  it("lists pieces in the order set by dragging them in the admin, highest key first", async () => {
    await activeProducts({ categories: { some: { categoryId: { in: ["c1"] } } } }, 8);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE", categories: { some: { categoryId: { in: ["c1"] } } } },
        orderBy: { sortKey: "desc" },
        take: 8,
      }),
    );
  });

  it("picks each category tile's photo in that order too, so the first piece leads", async () => {
    await tileProducts();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "ACTIVE" }, orderBy: { sortKey: "desc" } }));
  });
});

describe("the categories' order", () => {
  it("lists the departments, and the types in each, in the order set by dragging them in the admin", async () => {
    findCategories.mockResolvedValue([
      { id: "cards", slug: "cards", name: "Cards", labelColour: "nyoki-navy", parentId: null },
      { id: "clothing", slug: "clothing", name: "Clothing", labelColour: "nyoki-navy", parentId: null },
      { id: "valentine", slug: "valentine", name: "Valentine", labelColour: "nyoki-navy", parentId: "cards" },
      { id: "birthday", slug: "birthday", name: "Birthday", labelColour: "nyoki-navy", parentId: "cards" },
    ]);
    findLinks.mockResolvedValue([{ categoryId: "birthday" }, { categoryId: "valentine" }, { categoryId: "clothing" }]);

    const groups = await departments();

    expect(findCategories).toHaveBeenCalledWith({
      orderBy: CATEGORY_ORDER,
      select: { id: true, slug: true, name: true, labelColour: true, parentId: true },
    });
    expect(groups.map((group) => [group.slug, group.children.map((child) => child.slug)])).toEqual([
      ["cards", ["valentine", "birthday"]],
      ["clothing", []],
    ]);
  });

  it("shows only the departments and types with a piece on the shop in them", async () => {
    findCategories.mockResolvedValue([
      { id: "cards", slug: "cards", name: "Cards", labelColour: "nyoki-navy", parentId: null },
      { id: "easter", slug: "easter", name: "Easter", labelColour: "nyoki-navy", parentId: "cards" },
      { id: "birthday", slug: "birthday", name: "Birthday", labelColour: "nyoki-navy", parentId: "cards" },
      { id: "tableware", slug: "tableware", name: "Tableware", labelColour: "nyoki-navy", parentId: null },
    ]);
    findLinks.mockResolvedValue([{ categoryId: "birthday" }]);

    const groups = await departments();

    // A draft or an archived piece is not on the shop, so it fills nothing.
    expect(findLinks).toHaveBeenCalledWith({
      where: { product: { status: "ACTIVE" } },
      distinct: ["categoryId"],
      select: { categoryId: true },
    });
    expect(groups).toEqual([
      { slug: "cards", name: "Cards", labelColour: "nyoki-navy", children: [{ slug: "birthday", name: "Birthday", labelColour: "nyoki-navy" }] },
    ]);
  });

  it("takes the first few types of each in that order, where only a few are shown", async () => {
    findCategories.mockResolvedValue([
      { id: "cards", slug: "cards", name: "Cards", labelColour: "nyoki-navy", parentId: null },
      { id: "easter", slug: "easter", name: "Easter", labelColour: "nyoki-navy", parentId: "cards" },
      { id: "birthday", slug: "birthday", name: "Birthday", labelColour: "nyoki-navy", parentId: "cards" },
    ]);
    findLinks.mockResolvedValue([{ categoryId: "easter" }, { categoryId: "birthday" }]);

    const [cards] = await departments(1);

    expect(cards.children.map((child) => child.slug)).toEqual(["easter"]);
  });

  it("reads every category in that order, so the tiles a page shows follow it", async () => {
    await shopCategories();

    expect(findCategories).toHaveBeenCalledWith(expect.objectContaining({ orderBy: CATEGORY_ORDER }));
  });
});
