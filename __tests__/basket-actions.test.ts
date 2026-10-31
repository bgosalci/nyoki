/**
 * @jest-environment node
 */
import type { BasketProductRow } from "@/lib/basket/store";
import type { ReviewLine } from "@/lib/basket/review";

const findFirst = jest.fn();
const upsert = jest.fn();
const updateMany = jest.fn();
const lineFindFirst = jest.fn();
const deleteMany = jest.fn();
const refresh = jest.fn();
const orderingOpen = jest.fn();
const basketIdForWriting = jest.fn();
const findBasketId = jest.fn();
const loadReviewLines = jest.fn();
const reviewAndSave = jest.fn();
const activeRates = jest.fn();

jest.mock("server-only", () => ({}));
// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    product: { findFirst: (args: unknown) => findFirst(args) },
    basketLine: {
      upsert: (args: unknown) => upsert(args),
      updateMany: (args: unknown) => updateMany(args),
      findFirst: (args: unknown) => lineFindFirst(args),
      deleteMany: (args: unknown) => deleteMany(args),
    },
  },
}));
jest.mock("next/cache", () => ({ refresh: () => refresh() }));
jest.mock("../src/lib/ordering", () => ({ orderingOpen: () => orderingOpen() }));
jest.mock("../src/lib/basket/store", () => ({
  ...jest.requireActual("../src/lib/basket/store"),
  categoryNodes: async () => [{ id: "cards", slug: "cards", name: "Cards", parentId: null, usualGrams: 40, usualParcelSize: "LARGE_LETTER", usualThicknessMm: 5 }],
  basketIdForWriting: () => basketIdForWriting(),
  findBasketId: () => findBasketId(),
  loadReviewLines: (...args: unknown[]) => loadReviewLines(...args),
  reviewAndSave: (...args: unknown[]) => reviewAndSave(...args),
  activeRates: () => activeRates(),
}));

import { addToBasket, changeQuantity, putBack, removeLine } from "@/app/(shop)/basket/actions";
import { lineKey } from "@/lib/basket/key";
import { toReviewProduct } from "@/lib/basket/store";
import { EMPTY_CHOICES, SINGLE } from "@/lib/customisation/choices";

/** A Christmas card: £7.50 single, £19.50 for three, a printed message at 80p a card. */
function cardRow(overrides: Partial<BasketProductRow> = {}): BasketProductRow {
  return {
    id: "card",
    slug: "snowman-card",
    name: "Snowman Card",
    status: "ACTIVE",
    sku: "SNOW-1",
    stock: 10,
    oneOfAKind: false,
    leadTimeDays: null,
    vatRate: 20,
    pricePence: 750,
    compareAtPence: null,
    colours: [],
    sizes: [],
    madeToOrder: false,
    weightGrams: null,
    parcelSize: null,
    thicknessMm: null,
    images: [{ url: "/uploads/snowman.jpg" }],
    variants: [],
    categories: [{ categoryId: "cards" }],
    sales: [],
    customisation: {
      message: true,
      messagePricePence: 80,
      messageMaxLength: 200,
      personalisation: false,
      personalisationPricePence: 0,
      personalisationRequired: false,
    },
    personalisationFields: [],
    packs: [{ id: "p3", cards: 3, pricePence: 1950, position: 0 }],
    ...overrides,
  };
}

const printedPack = { ...EMPTY_CHOICES, unit: "p3", message: "Printed message" as const, messageText: " Merry Christmas ", quantity: 2 };
const stored = { variantId: null, packId: "p3", message: "Printed message" as const, messageText: "Merry Christmas", personalise: false, personalisation: {} };

const tracked48 = { id: "t48", name: "Royal Mail Tracked 48", pricePence: 395, freeOverPence: 4000, minDays: 2, maxDays: 3 };

beforeEach(() => {
  jest.clearAllMocks();
  orderingOpen.mockReturnValue(true);
  findFirst.mockResolvedValue(cardRow());
  basketIdForWriting.mockResolvedValue("b1");
  findBasketId.mockResolvedValue("b1");
  loadReviewLines.mockResolvedValue([]);
  reviewAndSave.mockResolvedValue({ lines: [], changes: [], updates: [], pieces: 2, subtotalPence: 4860 });
  activeRates.mockResolvedValue([tracked48]);
  upsert.mockResolvedValue({});
});

describe("addToBasket", () => {
  it("puts the piece in with its choices, never a price, and says what the basket now holds", async () => {
    const result = await addToBasket("card", printedPack);

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "card", status: "ACTIVE" } }));
    expect(upsert).toHaveBeenCalledWith({
      where: { basketId_key: { basketId: "b1", key: lineKey("card", stored) } },
      create: {
        basketId: "b1",
        productId: "card",
        ...stored,
        quantity: 2,
        key: lineKey("card", stored),
        // £19.50 and 3 × 80p: only to say later if the price changes.
        addedPricePence: 2190,
      },
      update: { quantity: { increment: 2 } },
    });
    expect(result).toEqual({
      ok: true,
      added: {
        name: "Snowman Card",
        image: "/uploads/snowman.jpg",
        quantity: 2,
        unitPence: 2190,
        details: [
          { label: "Single or pack", value: "Pack of 3" },
          { label: "Inside the card", value: "Printed: “Merry Christmas”" },
        ],
      },
      basket: { pieces: 2, subtotalPence: 4860, freeDelivery: { reached: true, rate: tracked48 } },
      note: null,
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("does nothing while ordering is closed, and says it opens soon", async () => {
    orderingOpen.mockReturnValue(false);

    expect(await addToBasket("card", printedPack)).toEqual({ ok: false, message: "Online ordering opens soon." });
    expect(upsert).not.toHaveBeenCalled();
    expect(basketIdForWriting).not.toHaveBeenCalled();
  });

  it("refuses a piece no longer on the shop", async () => {
    findFirst.mockResolvedValue(null);

    expect(await addToBasket("gone", printedPack)).toEqual({ ok: false, message: "Sorry, that piece is no longer on the shop." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("refuses choices that are not finished, checking by the page's own rules", async () => {
    const result = await addToBasket("card", { ...EMPTY_CHOICES, unit: SINGLE });

    expect(result).toEqual({ ok: false, message: "Please choose a message option." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("puts in only what the stock allows, and says so", async () => {
    // Seven cards: room for two packs of three.
    findFirst.mockResolvedValue(cardRow({ stock: 7 }));

    const result = await addToBasket("card", { ...printedPack, quantity: 5 });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { quantity: { increment: 2 } } }));
    expect(result).toMatchObject({ ok: true, added: { quantity: 2 }, note: "Sorry, we only have enough for 2, so we've added 2 rather than 5." });
  });

  it("says when what is already in the basket is why fewer went in", async () => {
    // Seven cards, a pack of three already in: room for one more pack.
    const product = toReviewProduct(cardRow({ stock: 7 }), [{ id: "cards", slug: "cards", name: "Cards", parentId: null, usualGrams: 40, usualParcelSize: "LARGE_LETTER", usualThicknessMm: 5 }], new Date());
    findFirst.mockResolvedValue(cardRow({ stock: 7 }));
    loadReviewLines.mockResolvedValue([{ id: "l1", quantity: 1, addedPricePence: 2190, stored, product } satisfies ReviewLine]);

    const result = await addToBasket("card", { ...printedPack, quantity: 5 });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { quantity: { increment: 1 } } }));
    expect(result).toMatchObject({
      ok: true,
      added: { quantity: 1 },
      note: "Sorry, with what's already in your basket we only have enough for 1 more, so we've added 1 rather than 5.",
    });
  });

  it("says nothing about how many when all of them went in", async () => {
    findFirst.mockResolvedValue(cardRow({ stock: 7 }));

    expect(await addToBasket("card", printedPack)).toMatchObject({ ok: true, added: { quantity: 2 }, note: null });
  });

  it("puts in nothing once the basket holds all there is", async () => {
    const product = toReviewProduct(cardRow({ stock: 6 }), [{ id: "cards", slug: "cards", name: "Cards", parentId: null, usualGrams: 40, usualParcelSize: "LARGE_LETTER", usualThicknessMm: 5 }], new Date());
    findFirst.mockResolvedValue(cardRow({ stock: 6 }));
    loadReviewLines.mockResolvedValue([{ id: "l1", quantity: 2, addedPricePence: 2190, stored, product } satisfies ReviewLine]);

    const result = await addToBasket("card", printedPack);

    expect(result).toEqual({ ok: false, message: "You already have all we have of this in your basket." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("says a piece with none left is out of stock", async () => {
    findFirst.mockResolvedValue(cardRow({ stock: 0 }));

    expect(await addToBasket("card", printedPack)).toEqual({ ok: false, message: "Sorry, this is out of stock." });
  });

  it("says a one-of-a-kind piece is already in the basket", async () => {
    const row = cardRow({ oneOfAKind: true, packs: [], customisation: null, categories: [] });
    findFirst.mockResolvedValue(row);
    const product = toReviewProduct(row, [], new Date());
    const plain = { variantId: null, packId: null, message: null, messageText: "", personalise: false, personalisation: {} };
    loadReviewLines.mockResolvedValue([{ id: "l1", quantity: 1, addedPricePence: 750, stored: plain, product }]);

    expect(await addToBasket("card", EMPTY_CHOICES)).toEqual({ ok: false, message: "This piece is one of a kind, and it's already in your basket." });
  });
});

describe("changeQuantity", () => {
  it("sets a line's quantity, only in the shopper's own basket, tidied into 1 to 99", async () => {
    await changeQuantity("l1", 140);

    expect(updateMany).toHaveBeenCalledWith({ where: { id: "l1", basketId: "b1" }, data: { quantity: 99 } });
    expect(refresh).toHaveBeenCalled();
  });

  it("does nothing without a basket, or while ordering is closed", async () => {
    findBasketId.mockResolvedValue(null);
    await changeQuantity("l1", 2);
    orderingOpen.mockReturnValue(false);
    findBasketId.mockResolvedValue("b1");
    await changeQuantity("l1", 2);

    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("removeLine and putBack", () => {
  const row = { id: "l1", basketId: "b1", productId: "card", variantId: null, packId: "p3", message: "Printed message", messageText: "Merry Christmas", personalise: false, personalisation: {}, quantity: 2, product: { name: "Snowman Card" } };

  it("takes the line out of the shopper's own basket, and hands back what is needed to put it back", async () => {
    lineFindFirst.mockResolvedValue(row);

    const removed = await removeLine("l1");

    expect(lineFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "l1", basketId: "b1" } }));
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "l1", basketId: "b1" } });
    expect(removed).toEqual({ productId: "card", name: "Snowman Card", quantity: 2, stored });
  });

  it("removes nothing that is not in the shopper's basket", async () => {
    lineFindFirst.mockResolvedValue(null);

    expect(await removeLine("someone-elses")).toBeNull();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("puts a removed line back as it was, checked again like any piece going in", async () => {
    const result = await putBack({ productId: "card", name: "Snowman Card", quantity: 2, stored });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ ...stored, quantity: 2 }) }));
    expect(result).toMatchObject({ ok: true });
  });

  it("will not put back choices the piece no longer offers", async () => {
    const result = await putBack({ productId: "card", name: "Snowman Card", quantity: 1, stored: { ...stored, packId: "p9" } });

    expect(result).toEqual({ ok: false, message: "The choices for Snowman Card have changed. Please choose again from its page." });
    expect(upsert).not.toHaveBeenCalled();
  });
});
