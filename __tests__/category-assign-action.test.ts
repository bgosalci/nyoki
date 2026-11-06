/**
 * @jest-environment node
 */
const categoryFindMany = jest.fn();
const productFindMany = jest.fn();
const deleteMany = jest.fn((args: unknown) => ({ deleteMany: args }));
const createMany = jest.fn((args: unknown) => ({ createMany: args }));
const transaction = jest.fn(async (steps: unknown[]) => steps);
const revalidatePath = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    category: { findMany: (args: unknown) => categoryFindMany(args) },
    product: { findMany: (args: unknown) => productFindMany(args) },
    categoryProduct: {
      deleteMany: (args: unknown) => deleteMany(args),
      createMany: (args: unknown) => createMany(args),
    },
    $transaction: (steps: unknown[]) => transaction(steps),
  },
}));
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: jest.fn(async () => ({ sub: "admin" })) }));
jest.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

import { changeCategoryProducts } from "@/app/admin/(protected)/categories/actions";
import { addProductsToCategories, removeProductsFromCategories } from "@/app/admin/(protected)/products/actions";
import { requireAdmin } from "@/lib/auth/dal";

const stored = (id: string, categoryIds: string[]) => ({
  id,
  name: id,
  status: "ACTIVE",
  stock: 1,
  colours: [],
  sizes: [],
  madeToOrder: false,
  madeOnOrder: false,
  variants: [],
  customisation: null,
  packs: [],
  categories: categoryIds.map((categoryId) => ({ categoryId })),
});

beforeEach(() => {
  jest.clearAllMocks();
  categoryFindMany.mockResolvedValue([
    { id: "gifts", slug: "gifts", name: "Gifts", parentId: null },
    { id: "home", slug: "home", name: "Home", parentId: null },
  ]);
  productFindMany.mockResolvedValue([stored("a", []), stored("b", ["gifts"])]);
});

describe("addProductsToCategories", () => {
  it("is for the shop's staff only", async () => {
    (requireAdmin as jest.Mock).mockRejectedValueOnce(new Error("signed out"));

    await expect(addProductsToCategories(["a"], ["gifts"])).rejects.toThrow("signed out");

    expect(productFindMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("writes only the links missing, tolerating one added at the same moment", async () => {
    const result = await addProductsToCategories(["a", "b"], ["gifts"]);

    expect(createMany).toHaveBeenCalledWith({ data: [{ productId: "a", categoryId: "gifts" }], skipDuplicates: true });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, said: ["Added 1 product to Gifts. 1 was in it already."] });
  });

  it("refreshes the products list, the categories and the shop, whose menus follow what is filed where", async () => {
    await addProductsToCategories(["a"], ["gifts"]);

    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/categories");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("writes nothing when there is nothing to add", async () => {
    await addProductsToCategories(["b"], ["gifts"]);

    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses a category that has gone, rather than saying it worked", async () => {
    await expect(addProductsToCategories(["a"], ["deleted"])).resolves.toEqual({ ok: false });

    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("when every piece has gone", () => {
  it("refuses, rather than saying they were not in it", async () => {
    productFindMany.mockResolvedValue([]);

    await expect(addProductsToCategories(["deleted"], ["gifts"])).resolves.toEqual({ ok: false });
    await expect(removeProductsFromCategories(["deleted"], ["gifts"])).resolves.toEqual({ ok: false });

    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("removeProductsFromCategories", () => {
  it("is for the shop's staff only", async () => {
    (requireAdmin as jest.Mock).mockRejectedValueOnce(new Error("signed out"));

    await expect(removeProductsFromCategories(["b"], ["gifts"])).rejects.toThrow("signed out");

    expect(transaction).not.toHaveBeenCalled();
  });

  it("deletes only those links, leaving the pieces and their other categories", async () => {
    const result = await removeProductsFromCategories(["a", "b"], ["gifts"]);

    expect(deleteMany).toHaveBeenCalledWith({ where: { OR: [{ productId: "b", categoryId: "gifts" }] } });
    expect(createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, said: ["Took 1 product out of Gifts. 1 was not in it."] });
  });
});

describe("changeCategoryProducts", () => {
  it("is for the shop's staff only", async () => {
    (requireAdmin as jest.Mock).mockRejectedValueOnce(new Error("signed out"));

    await expect(changeCategoryProducts("gifts", { add: ["a"], remove: ["b"] })).rejects.toThrow("signed out");

    expect(transaction).not.toHaveBeenCalled();
  });

  it("adds and takes out in one transaction, so a failure leaves it as it was", async () => {
    const result = await changeCategoryProducts("gifts", { add: ["a"], remove: ["b"] });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction.mock.calls[0][0]).toHaveLength(2);
    expect(createMany).toHaveBeenCalledWith({ data: [{ productId: "a", categoryId: "gifts" }], skipDuplicates: true });
    expect(deleteMany).toHaveBeenCalledWith({ where: { OR: [{ productId: "b", categoryId: "gifts" }] } });
    expect(result).toEqual({ ok: true, said: ["Added 1 product to Gifts and took 1 out."] });
  });

  it("touches only what was changed, so pieces added elsewhere since the page opened stay", async () => {
    await changeCategoryProducts("gifts", { add: ["a"], remove: [] });

    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("refreshes the category's own page", async () => {
    await changeCategoryProducts("gifts", { add: ["a"], remove: [] });

    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("refuses a category that has gone", async () => {
    await expect(changeCategoryProducts("deleted", { add: ["a"], remove: [] })).resolves.toEqual({ ok: false });

    expect(transaction).not.toHaveBeenCalled();
  });
});
