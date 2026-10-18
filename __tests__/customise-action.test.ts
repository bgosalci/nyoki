/**
 * @jest-environment node
 */
const findUnique = jest.fn();
const findMany = jest.fn();
const upsert = jest.fn((args: unknown) => ({ upsert: args }));
const deleteFields = jest.fn((args: unknown) => ({ deleteFields: args }));
const createFields = jest.fn((args: unknown) => ({ createFields: args }));
const deletePacks = jest.fn((args: unknown) => ({ deletePacks: args }));
const createPacks = jest.fn((args: unknown) => ({ createPacks: args }));
const transaction = jest.fn(async (steps: unknown[]) => steps);
const revalidatePath = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    product: { findUnique: (args: unknown) => findUnique(args) },
    category: { findMany: (args: unknown) => findMany(args) },
    productCustomisation: { upsert: (args: unknown) => upsert(args) },
    personalisationField: { deleteMany: (args: unknown) => deleteFields(args), createMany: (args: unknown) => createFields(args) },
    productPack: { deleteMany: (args: unknown) => deletePacks(args), createMany: (args: unknown) => createPacks(args) },
    $transaction: (steps: unknown[]) => transaction(steps),
  },
}));
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: jest.fn(async () => ({ sub: "admin" })) }));
jest.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import { saveCustomisation } from "@/app/admin/(protected)/products/[id]/customise/actions";
import { requireAdmin } from "@/lib/auth/dal";

const categories = [
  { id: "cards", slug: "cards", parentId: null },
  { id: "birthday", slug: "birthday-card", parentId: "cards" },
  { id: "clothes", slug: "clothes", parentId: null },
];

function form(entries: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

const everything = {
  message: "on",
  messagePrice: "0.80",
  messageMaxLength: "250",
  personalisation: "on",
  personalisationPrice: "1.50",
  fieldLabel: ["Name"],
  fieldKind: ["TEXT"],
  fieldMaxLength: ["20"],
  fieldChoices: [""],
  packCards: ["3"],
  packPrice: ["15"],
};

beforeEach(() => {
  jest.clearAllMocks();
  findUnique.mockResolvedValue({ slug: "birthday-moth", categories: [{ categoryId: "birthday" }] });
  findMany.mockResolvedValue(categories);
});

describe("saveCustomisation", () => {
  it("is for the shop's staff only", async () => {
    await saveCustomisation("p1", { errors: {} }, form(everything));

    expect(requireAdmin).toHaveBeenCalled();
  });

  it("saves every section in one transaction", async () => {
    await expect(saveCustomisation("p1", { errors: {} }, form(everything))).resolves.toEqual({ errors: {}, saved: true });

    const settings = {
      message: true,
      messagePricePence: 80,
      messageMaxLength: 250,
      personalisation: true,
      personalisationPricePence: 150,
      personalisationRequired: false,
    };
    expect(upsert).toHaveBeenCalledWith({ where: { productId: "p1" }, create: { productId: "p1", ...settings }, update: settings });
    expect(deleteFields).toHaveBeenCalledWith({ where: { productId: "p1" } });
    expect(createFields).toHaveBeenCalledWith({
      data: [{ productId: "p1", position: 0, label: "Name", kind: "TEXT", maxLength: 20, choices: [] }],
    });
    expect(deletePacks).toHaveBeenCalledWith({ where: { productId: "p1" } });
    expect(createPacks).toHaveBeenCalledWith({ data: [{ productId: "p1", position: 0, cards: 3, pricePence: 1500 }] });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction.mock.calls[0][0]).toHaveLength(5);
  });

  it("leaves a switched-off section's stored settings as they were", async () => {
    await saveCustomisation("p1", { errors: {} }, form({ packCards: ["3"], packPrice: ["15"] }));

    expect(upsert).toHaveBeenCalledWith({
      where: { productId: "p1" },
      create: { productId: "p1", message: false, personalisation: false },
      update: { message: false, personalisation: false },
    });
    expect(deleteFields).not.toHaveBeenCalled();
    expect(createFields).not.toHaveBeenCalled();
  });

  it("clears the packs when none are left", async () => {
    await saveCustomisation("p1", { errors: {} }, form({}));

    expect(deletePacks).toHaveBeenCalledWith({ where: { productId: "p1" } });
    expect(createPacks).toHaveBeenCalledWith({ data: [] });
  });

  it("refreshes the admin and the shop's page for the piece", async () => {
    await saveCustomisation("p1", { errors: {} }, form(everything));

    expect(revalidatePath).toHaveBeenCalledWith("/admin/products/p1", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/product/birthday-moth");
  });

  it("hands back what was wrong and saves nothing", async () => {
    const result = await saveCustomisation("p1", { errors: {} }, form({ ...everything, messagePrice: "lots" }));

    expect(result).toEqual({ errors: { messagePrice: "Write the cost as pounds and pence, like 0.80." } });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses a piece that is not a card or bookmark, whatever is posted", async () => {
    findUnique.mockResolvedValue({ slug: "dress", categories: [{ categoryId: "clothes" }] });

    const result = await saveCustomisation("p1", { errors: {} }, form(everything));

    expect(result).toEqual({
      errors: { form: "Only cards and bookmarks can be customised. Put this piece in Cards or Bookmarks first." },
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses a piece that has gone", async () => {
    findUnique.mockResolvedValue(null);

    const result = await saveCustomisation("p1", { errors: {} }, form(everything));

    expect(result).toEqual({ errors: { form: "This piece no longer exists." } });
    expect(transaction).not.toHaveBeenCalled();
  });
});
