/**
 * @jest-environment node
 */
const findMany = jest.fn();

// jest.mock() does not go through the @/ alias, so this is relative.
jest.mock("../src/lib/db", () => ({ db: { product: { findMany: (args: unknown) => findMany(args) } } }));

import { activeProducts, tileProducts } from "@/lib/storefront/queries";

beforeEach(() => findMany.mockReset().mockResolvedValue([]));

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
