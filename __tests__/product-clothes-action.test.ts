/**
 * @jest-environment node
 */
type Call = { op: string; args: unknown };

const variantsStored = jest.fn();
const transaction = jest.fn(async (steps: unknown[]) => steps);
const productCreate = jest.fn(async (_args: unknown) => ({ id: "new" }));
// A declaration, so the hoisted mock below can use it.
function step(op: string) {
  return (args: unknown): Call => ({ op, args });
}

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    product: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => ({ pricePence: 4500 })),
      update: (args: unknown) => step("product.update")(args),
      create: (args: unknown) => productCreate(args),
    },
    category: {
      findMany: jest.fn(async () => [
        { id: "clothes", slug: "clothes", parentId: null },
        { id: "dresses", slug: "dresses", parentId: "clothes" },
        { id: "mugs", slug: "mugs", parentId: null },
      ]),
    },
    categoryProduct: { deleteMany: step("categoryProduct.deleteMany") },
    alsoLike: { deleteMany: step("alsoLike.deleteMany") },
    productVariant: {
      findMany: (args: unknown) => variantsStored(args),
      deleteMany: step("productVariant.deleteMany"),
      update: step("productVariant.update"),
      createMany: step("productVariant.createMany"),
    },
    $transaction: (steps: unknown[]) => transaction(steps),
  },
}));
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: jest.fn(async () => ({ sub: "admin" })) }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

import { createProduct, updateProduct } from "@/app/admin/(protected)/products/actions";
import { stockFieldName } from "@/lib/clothes/settings";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of [["name", "Flower Dress"], ["status", "DRAFT"], ...entries] as [string, string][]) data.append(key, value);
  return data;
}

const colour = (name: string, was = name): [string, string][] => [
  ["colour", name],
  ["colourWas", was],
];
const size = (name: string, was = name): [string, string][] => [
  ["size", name],
  ["sizeWas", was],
];

/** What went into the one transaction, by operation. */
const steps = (op: string) => (transaction.mock.calls[0]?.[0] as Call[]).filter((call) => call.op === op).map((call) => call.args);
const productData = () => (steps("product.update")[0] as { data: Record<string, unknown> }).data;

beforeEach(() => {
  jest.clearAllMocks();
  variantsStored.mockResolvedValue([]);
});

describe("saving a piece of clothing's details", () => {
  it("saves its colours and sizes, and its stock as the total of every colour in every size", async () => {
    const result = await updateProduct(
      "p1",
      { errors: {} },
      form([
        ["categoryIds", "dresses"],
        ["stock", "99"],
        ...colour("Lupin"),
        ...colour("Gypsum"),
        ...size("3-4 years"),
        [stockFieldName(0, 0), "2"],
        [stockFieldName(1, 0), "3"],
      ]),
    );

    expect(result).toEqual({ errors: {} });
    expect(productData()).toMatchObject({ colours: ["Lupin", "Gypsum"], sizes: ["3-4 years"], stock: 5 });
  });

  it("keeps each variant it can, and adds and removes the rest, all in the one transaction", async () => {
    variantsStored.mockResolvedValue([
      { id: "v-lupin", colour: "Lupin", size: "3-4 years" },
      { id: "v-old", colour: "Lupin", size: "2-3 years" },
    ]);

    await updateProduct(
      "p1",
      { errors: {} },
      form([["categoryIds", "dresses"], ...colour("Lupin"), ...colour("Gypsum", ""), ...size("3-4 years"), [stockFieldName(0, 0), "2"], [stockFieldName(1, 0), "1"]]),
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(steps("productVariant.update")).toEqual([
      { where: { id: "v-lupin" }, data: { colour: "Lupin", size: "3-4 years", name: "Lupin / 3-4 years", stock: 2, position: 0 } },
    ]);
    expect(steps("productVariant.createMany")).toEqual([
      { data: [{ productId: "p1", colour: "Gypsum", size: "3-4 years", name: "Gypsum / 3-4 years", stock: 1, position: 1 }] },
    ]);
    expect(steps("productVariant.deleteMany")).toEqual([{ where: { id: { in: ["v-old"] } } }]);
  });

  it("takes the Stock box for clothes in no colours or sizes, and removes any variants left", async () => {
    variantsStored.mockResolvedValue([{ id: "v-old", colour: null, size: "S" }]);

    await updateProduct("p1", { errors: {} }, form([["categoryIds", "dresses"], ["stock", "4"]]));

    expect(productData()).toMatchObject({ colours: [], sizes: [], stock: 4 });
    expect(steps("productVariant.deleteMany")).toEqual([{ where: { id: { in: ["v-old"] } } }]);
  });

  it("saves the colours of a piece that is not clothing, and its stock as theirs, but never its sizes", async () => {
    await updateProduct(
      "p1",
      { errors: {} },
      form([["categoryIds", "mugs"], ["stock", "7"], ...colour("Pink"), ...colour("Cream", ""), ...size("S"), [stockFieldName(0, null), "2"], [stockFieldName(1, null), "1"]]),
    );

    expect(productData()).toMatchObject({ colours: ["Pink", "Cream"], stock: 3 });
    expect(productData()).not.toHaveProperty("sizes");
    expect(steps("productVariant.createMany")).toEqual([
      {
        data: [
          { productId: "p1", colour: "Pink", size: null, name: "Pink", stock: 2, position: 0 },
          { productId: "p1", colour: "Cream", size: null, name: "Cream", stock: 1, position: 1 },
        ],
      },
    ]);
  });

  it("leaves a piece that is not clothing its sized variants, kept for if it goes back to Clothes", async () => {
    variantsStored.mockResolvedValue([
      { id: "v-sized", colour: "Tarn", size: "80 x 70 cm" },
      { id: "v-tarn", colour: "Tarn", size: null },
    ]);

    await updateProduct("p1", { errors: {} }, form([["categoryIds", "mugs"], ...colour("Tarn"), [stockFieldName(0, null), "4"]]));

    expect(steps("productVariant.update")).toEqual([
      { where: { id: "v-tarn" }, data: { colour: "Tarn", size: null, name: "Tarn", stock: 4, position: 0 } },
    ]);
    expect(steps("productVariant.deleteMany")).toEqual([]);
  });

  it("takes the Stock box for a piece that is not clothing in no colours, and leaves its sizes alone", async () => {
    variantsStored.mockResolvedValue([{ id: "v-sized", colour: null, size: "1-2 years" }]);

    await updateProduct("p1", { errors: {} }, form([["categoryIds", "mugs"], ["stock", "7"]]));

    expect(productData()).toMatchObject({ colours: [], stock: 7 });
    expect(productData()).not.toHaveProperty("sizes");
    expect(steps("productVariant.deleteMany")).toEqual([]);
  });

  it("reports every problem at once, the clothing's with the rest, and saves nothing", async () => {
    const data = form([["categoryIds", "dresses"], ...colour("Red"), ...colour("red"), [stockFieldName(0, null), "x"]]);
    data.set("name", "");

    const result = await updateProduct("p1", { errors: {} }, data);

    expect(result.errors).toEqual({
      name: "Give the product a name.",
      colours: "There are two colours called “Red”.",
      variantStock: "Stock has to be a whole number, zero or more.",
    });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("creating a piece of clothing", () => {
  it("creates it with its colours, sizes and a variant for each colour in each size", async () => {
    await createProduct({ errors: {} }, form([["categoryIds", "dresses"], ...colour("Lupin", ""), ...size("S", ""), ...size("M", ""), [stockFieldName(0, 0), "1"], [stockFieldName(0, 1), "2"]]));

    expect(productCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          colours: ["Lupin"],
          sizes: ["S", "M"],
          stock: 3,
          variants: {
            create: [
              { colour: "Lupin", size: "S", name: "Lupin / S", stock: 1, position: 0 },
              { colour: "Lupin", size: "M", name: "Lupin / M", stock: 2, position: 1 },
            ],
          },
        }),
      }),
    );
  });
});

describe("creating a piece that is not clothing", () => {
  it("creates it with a variant for each colour, and no sizes", async () => {
    await createProduct({ errors: {} }, form([["categoryIds", "mugs"], ...colour("Pink", ""), [stockFieldName(0, null), "2"]]));

    const data = (productCreate.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ colours: ["Pink"], stock: 2, variants: { create: [{ colour: "Pink", size: null, name: "Pink", stock: 2, position: 0 }] } });
    expect(data).not.toHaveProperty("sizes");
  });
});
