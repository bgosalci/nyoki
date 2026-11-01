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
      { id: "cards", slug: "cards", name: "Cards", labelColour: "nyoki-navy", parentId: null, active: true },
      { id: "clothing", slug: "clothing", name: "Clothing", labelColour: "nyoki-navy", parentId: null, active: true },
      { id: "valentine", slug: "valentine", name: "Valentine", labelColour: "nyoki-navy", parentId: "cards", active: true },
      { id: "birthday", slug: "birthday", name: "Birthday", labelColour: "nyoki-navy", parentId: "cards", active: true },
    ]);
    findLinks.mockResolvedValue([{ categoryId: "birthday" }, { categoryId: "valentine" }, { categoryId: "clothing" }]);

    const groups = await departments();

    expect(findCategories).toHaveBeenCalledWith({
      orderBy: CATEGORY_ORDER,
      select: { id: true, slug: true, name: true, labelColour: true, parentId: true, active: true },
    });
    expect(groups.map((group) => [group.slug, group.children.map((child) => child.slug)])).toEqual([
      ["cards", ["valentine", "birthday"]],
      ["clothing", []],
    ]);
  });

  it("shows only the departments and types with a piece on the shop in them", async () => {
    findCategories.mockResolvedValue([
      { id: "cards", slug: "cards", name: "Cards", labelColour: "nyoki-navy", parentId: null, active: true },
      { id: "easter", slug: "easter", name: "Easter", labelColour: "nyoki-navy", parentId: "cards", active: true },
      { id: "birthday", slug: "birthday", name: "Birthday", labelColour: "nyoki-navy", parentId: "cards", active: true },
      { id: "tableware", slug: "tableware", name: "Tableware", labelColour: "nyoki-navy", parentId: null, active: true },
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
      { id: "cards", slug: "cards", name: "Cards", labelColour: "nyoki-navy", parentId: null, active: true },
      { id: "easter", slug: "easter", name: "Easter", labelColour: "nyoki-navy", parentId: "cards", active: true },
      { id: "birthday", slug: "birthday", name: "Birthday", labelColour: "nyoki-navy", parentId: "cards", active: true },
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

describe("a category's status", () => {
  const tree = [
    { id: "cards", slug: "cards", name: "Cards", labelColour: "nyoki-navy", parentId: null, description: null, active: true },
    { id: "christmas", slug: "christmas", name: "Christmas", labelColour: "nyoki-navy", parentId: "cards", description: null, active: false },
    { id: "packs", slug: "christmas-packs", name: "Christmas Packs", labelColour: "nyoki-navy", parentId: "christmas", description: null, active: true },
    { id: "birthday", slug: "birthday", name: "Birthday", labelColour: "nyoki-navy", parentId: "cards", description: null, active: true },
  ];

  it("leaves an inactive category, and everything inside it, out of the header and footer, pieces or not", async () => {
    findCategories.mockResolvedValue(tree);
    findLinks.mockResolvedValue([{ categoryId: "christmas" }, { categoryId: "packs" }, { categoryId: "birthday" }]);

    const groups = await departments();

    expect(groups.map((group) => [group.slug, group.children.map((child) => child.slug)])).toEqual([["cards", ["birthday"]]]);
  });

  it("does not light a department up for pieces filed only in an inactive type beneath it", async () => {
    findCategories.mockResolvedValue(tree);
    findLinks.mockResolvedValue([{ categoryId: "packs" }]);

    expect(await departments()).toEqual([]);
  });

  it("gives the shop's pages only the categories on the shop, so an inactive one has no page and no tile", async () => {
    findCategories.mockResolvedValue(tree);

    const shown = await shopCategories();

    expect(findCategories).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ active: true }) }));
    expect(shown.map((category) => category.slug)).toEqual(["cards", "birthday"]);
  });
});
