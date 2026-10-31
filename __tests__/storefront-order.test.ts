/**
 * @jest-environment node
 */
const findMany = jest.fn();
const findCategories = jest.fn();

// jest.mock() does not go through the @/ alias, so this is relative.
jest.mock("../src/lib/db", () => ({
  db: {
    product: { findMany: (args: unknown) => findMany(args) },
    category: { findMany: (args: unknown) => findCategories(args) },
  },
}));

import { CATEGORY_ORDER } from "@/lib/categories/ordering";
import { activeProducts, departments, shopCategories, tileProducts } from "@/lib/storefront/queries";

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([]);
  findCategories.mockReset().mockResolvedValue([]);
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
    await departments();

    expect(findCategories).toHaveBeenCalledWith({
      where: { parentId: null },
      orderBy: CATEGORY_ORDER,
      select: {
        slug: true,
        name: true,
        labelColour: true,
        children: { orderBy: CATEGORY_ORDER, take: undefined, select: { slug: true, name: true, labelColour: true } },
      },
    });
  });

  it("takes the first few types of each in that order, where only a few are shown", async () => {
    await departments(6);

    expect(findCategories).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.objectContaining({ children: expect.objectContaining({ take: 6 }) }) }),
    );
  });

  it("reads every category in that order, so the tiles a page shows follow it", async () => {
    await shopCategories();

    expect(findCategories).toHaveBeenCalledWith(expect.objectContaining({ orderBy: CATEGORY_ORDER }));
  });
});
