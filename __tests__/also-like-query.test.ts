/**
 * @jest-environment node
 */
const findMany = jest.fn();

// jest.mock() does not go through the @/ alias, so this is relative.
jest.mock("../src/lib/db", () => ({ db: { product: { findMany: (args: unknown) => findMany(args) } } }));

import { automaticAlsoLike, CARD_SELECT } from "@/lib/storefront/queries";

beforeEach(() => findMany.mockReset().mockResolvedValue([]));

describe("automaticAlsoLike, the pieces a product's page picks by itself", () => {
  it("asks for pieces on the shop from the same categories, not the product itself, newest first", async () => {
    const rows = [{ id: "p2" }];
    findMany.mockResolvedValue(rows);

    await expect(automaticAlsoLike("p1", ["c1", "c2"])).resolves.toBe(rows);

    expect(findMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE", id: { not: "p1" }, categories: { some: { categoryId: { in: ["c1", "c2"] } } } },
      orderBy: { createdAt: "desc" },
      // Twice what is shown, so pieces she has chosen herself still leave enough to fill the row.
      take: 8,
      select: CARD_SELECT,
    });
  });

  it("finds nothing for a product in no category, without asking", async () => {
    await expect(automaticAlsoLike("p1", [])).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
