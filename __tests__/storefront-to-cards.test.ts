/**
 * @jest-environment node
 */
const categoriesStored = jest.fn();

// jest.mock() does not go through the @/ alias, so this is relative.
jest.mock("../src/lib/db", () => ({ db: { category: { findMany: (args: unknown) => categoriesStored(args) } } }));

import { toCards } from "@/lib/storefront/queries";

const row = (categoryIds: string[]) => ({
  id: "p1",
  status: "ACTIVE" as const,
  slug: "double-moss-hat",
  name: "Double Moss Hat",
  pricePence: 4500,
  compareAtPence: null,
  oneOfAKind: false,
  madeToOrder: false,
  madeOnOrder: false,
  leadTimeDays: null,
  images: [],
  colours: ["Frost", "Tarn"],
  sizes: ["1-2 years"],
  variants: [
    { colour: "Frost", size: "1-2 years", stock: 1 },
    { colour: "Tarn", size: "1-2 years", stock: 1 },
  ],
  categories: categoryIds.map((categoryId) => ({ categoryId })),
  sales: [],
});

beforeEach(() =>
  categoriesStored.mockReset().mockResolvedValue([
    { id: "clothes", slug: "clothes", parentId: null },
    { id: "hats", slug: "unisex-hat", parentId: "clothes" },
    { id: "gifts", slug: "gifts", parentId: null },
  ]),
);

describe("toCards", () => {
  it("tells clothing by the piece's categories, so its colours count by their stock in any size", async () => {
    const [card] = await toCards([row(["hats"])]);

    expect(card.colours).toBe(2);
  });

  it("counts a piece outside Clothes by its colours' own stock, as its page does", async () => {
    const [card] = await toCards([row(["gifts"])]);

    expect(card.colours).toBeNull();
  });

  it("reads every category, inactive ones too: what a piece is does not change with what is on the shop", async () => {
    await toCards([row(["hats"])]);

    expect(categoriesStored).toHaveBeenCalledWith({ select: { id: true, slug: true, parentId: true } });
  });

  it("asks for no categories when there are no cards", async () => {
    await expect(toCards([])).resolves.toEqual([]);
    expect(categoriesStored).not.toHaveBeenCalled();
  });
});
