import { EMPTY_CHOICES, SINGLE, type Choices } from "@/lib/customisation/choices";
import type { Offer } from "@/lib/customisation/offer";
import { fitsOffer, lineDetails, toChoices, toStored, type StoredChoices, type VariantRow } from "@/lib/basket/lines";
import { reviewBasket, roomFor, type ReviewLine, type ReviewProduct } from "@/lib/basket/review";

const names = { id: "f1", label: "Names", kind: "TEXT" as const, maxLength: 30, choices: [] };
const sign = { id: "f2", label: "Zodiac sign", kind: "CHOICE" as const, maxLength: null, choices: ["Leo", "Aries"] };

/** A card: single £7.50, a pack of three £19.50, a printed message at 80p a card, optional names at 50p a card. */
const card: Offer = {
  noun: { one: "card", many: "cards" },
  single: { pricePence: 750, wasPence: null },
  packs: [{ id: "p3", cards: 3, pricePence: 1950, wasPence: null }],
  message: { pricePence: 80, maxLength: 200 },
  personalisation: { pricePence: 50, required: false, fields: [names, sign] },
  clothing: null,
};

/** A hat in two colours and two sizes. */
const hatVariants: VariantRow[] = [
  { id: "v-sea-2", colour: "Seascape", size: "2-3 years", stock: 3, sku: "HAT-SEA-2", name: "Seascape / 2-3 years" },
  { id: "v-sea-3", colour: "Seascape", size: "3-4 years", stock: 0, sku: null, name: "Seascape / 3-4 years" },
  { id: "v-pol-2", colour: "Polar", size: "2-3 years", stock: 1, sku: null, name: "Polar / 2-3 years" },
];
const hat: Offer = {
  noun: { one: "piece", many: "pieces" },
  single: { pricePence: 4500, wasPence: null },
  packs: [],
  message: null,
  personalisation: null,
  clothing: {
    colours: ["Seascape", "Polar"],
    sizes: ["2-3 years", "3-4 years"],
    stock: hatVariants.map(({ colour, size, stock }) => ({ colour, size, stock })),
    madeToOrder: false,
  },
};

/** Nothing to choose, in a sale: £4.00, was £5.00. */
const plain: Offer = {
  noun: { one: "piece", many: "pieces" },
  single: { pricePence: 400, wasPence: 500 },
  packs: [],
  message: null,
  personalisation: null,
  clothing: null,
};

const choose = (patch: Partial<Choices>): Choices => ({ ...EMPTY_CHOICES, ...patch });

const PLAIN: StoredChoices = { variantId: null, packId: null, message: null, messageText: "", personalise: false, personalisation: {} };

function product(overrides: Partial<ReviewProduct> = {}): ReviewProduct {
  return {
    id: "reindeer",
    slug: "red-christmas-reindeer",
    name: "Red Christmas Reindeer Card",
    status: "ACTIVE",
    sku: "REIN-1",
    image: "/uploads/reindeer.jpg",
    stock: 10,
    madeToOrder: false,
    leadTimeDays: null,
    oneOfAKind: false,
    vatRate: 20,
    saleName: "Winter sale",
    offer: plain,
    variants: [],
    postage: { grams: 40, size: "LARGE_LETTER", mm: 5 },
    ...overrides,
  };
}

function line(overrides: Partial<ReviewLine> = {}): ReviewLine {
  return { id: "l1", quantity: 1, addedPricePence: 400, stored: PLAIN, product: product(), ...overrides };
}

describe("toStored", () => {
  it("keeps a pack, the printed words and the personalisation, trimmed", () => {
    const stored = toStored(
      card,
      choose({
        unit: "p3",
        message: "Printed message",
        messageText: "  Merry Christmas  ",
        personalise: true,
        personalisation: { f1: " Rebecca & Oscar ", f2: "Leo", stray: "x" },
      }),
      [],
    );

    expect(stored).toEqual({
      variantId: null,
      packId: "p3",
      message: "Printed message",
      messageText: "Merry Christmas",
      personalise: true,
      personalisation: { f1: "Rebecca & Oscar", f2: "Leo" },
    });
  });

  it("keeps none of what the choices hide: words for a card left blank, names with personalising off", () => {
    const stored = toStored(
      card,
      choose({ unit: SINGLE, message: "Blank inside", messageText: "typed then changed", personalise: false, personalisation: { f1: "Ada" } }),
      [],
    );

    expect(stored).toEqual({ ...PLAIN, message: "Blank inside" });
  });

  it("finds the variant for clothing's colour and size", () => {
    const stored = toStored(hat, choose({ colour: "Polar", size: "2-3 years" }), hatVariants);

    expect(stored).toEqual({ ...PLAIN, variantId: "v-pol-2" });
  });

  it("is null while anything is still to choose, or out of stock", () => {
    expect(toStored(card, choose({ unit: "p3" }), [])).toBeNull();
    expect(toStored(hat, choose({ colour: "Seascape" }), hatVariants)).toBeNull();
    expect(toStored(hat, choose({ colour: "Seascape", size: "3-4 years" }), hatVariants)).toBeNull();
  });
});

describe("toChoices", () => {
  it("turns a line back into the choices it was made from", () => {
    const choices = toChoices(hat, { ...PLAIN, variantId: "v-sea-2" }, hatVariants, 2);

    expect(choices).toMatchObject({ colour: "Seascape", size: "2-3 years", quantity: 2 });
  });

  it("is null when the line no longer fits the piece: its variant gone, or clothing no longer clothing", () => {
    expect(toChoices(hat, { ...PLAIN, variantId: "gone" }, hatVariants)).toBeNull();
    expect(toChoices(hat, PLAIN, hatVariants)).toBeNull();
    expect(toChoices(plain, { ...PLAIN, variantId: "v-sea-2" }, hatVariants)).toBeNull();
  });
});

describe("lineDetails", () => {
  it("names each choice in words, each personalised thing on its own", () => {
    const rows = lineDetails(
      card,
      choose({ unit: "p3", message: "Printed message", messageText: "Merry Christmas", personalise: true, personalisation: { f1: "Rebecca", f2: "Leo" } }),
    );

    expect(rows).toEqual([
      { label: "Single or pack", value: "Pack of 3" },
      { label: "Inside the card", value: "Printed: “Merry Christmas”" },
      { label: "Names", value: "Rebecca" },
      { label: "Zodiac sign", value: "Leo" },
    ]);
  });

  it("says a single card is a single card, and a blank one is blank", () => {
    expect(lineDetails(card, choose({ unit: SINGLE, message: "Blank inside" }))).toEqual([
      { label: "Single or pack", value: "Single card" },
      { label: "Inside the card", value: "Blank inside" },
    ]);
  });

  it("gives clothing its colour and size, and a plain piece nothing", () => {
    expect(lineDetails(hat, choose({ colour: "Seascape", size: "2-3 years" }))).toEqual([
      { label: "Colour", value: "Seascape" },
      { label: "Size", value: "2-3 years" },
    ]);
    expect(lineDetails(plain, EMPTY_CHOICES)).toEqual([]);
  });
});

describe("reviewBasket", () => {
  it("prices each line afresh: a pack with its extras charged per card, times the quantity", () => {
    const stored: StoredChoices = { ...PLAIN, packId: "p3", message: "Printed message", messageText: "Hi", personalise: true, personalisation: { f1: "Ada", f2: "Leo" } };
    const review = reviewBasket([line({ quantity: 2, addedPricePence: 2340, stored, product: product({ offer: card, saleName: null }) })]);

    // £19.50 + 3 × (80p + 50p) = £23.40 a pack.
    expect(review.lines[0]).toMatchObject({ unitPence: 2340, quantity: 2, totalPence: 4680, wasUnitPence: null });
    expect(review.subtotalPence).toBe(4680);
    expect(review.pieces).toBe(2);
    expect(review.changes).toEqual([]);
    expect(review.updates).toEqual([]);
  });

  it("carries each line's postage, and how many pieces go: a pack of three is three", () => {
    const stored: StoredChoices = { ...PLAIN, packId: "p3", message: "Blank inside" };
    const review = reviewBasket([line({ quantity: 2, addedPricePence: 1950, stored, product: product({ offer: card, saleName: null }) })]);

    expect(review.lines[0]).toMatchObject({ postage: { grams: 40, size: "LARGE_LETTER", mm: 5 }, units: 6 });
  });

  it("shows what a piece in a sale was, and the sale's name", () => {
    const review = reviewBasket([line({ quantity: 2 })]);

    expect(review.lines[0]).toMatchObject({ unitPence: 400, wasUnitPence: 500, saleName: "Winter sale", totalPence: 800, vatRate: 20 });
  });

  it("says when a price has changed since the piece went in, and remembers the new one", () => {
    const review = reviewBasket([line({ addedPricePence: 500 })]);

    expect(review.changes).toEqual(["Red Christmas Reindeer Card is now £4.00 each. It was £5.00 when you added it."]);
    expect(review.updates).toEqual([{ id: "l1", addedPricePence: 400 }]);
  });

  it("takes out a piece that has come off the shop, and says so", () => {
    const review = reviewBasket([line({ product: product({ status: "ARCHIVED" }) })]);

    expect(review.lines).toEqual([]);
    expect(review.changes).toEqual(["Red Christmas Reindeer Card is no longer on the shop, so we've taken it out of your basket."]);
    expect(review.updates).toEqual([{ id: "l1", remove: true }]);
  });

  it("takes out a line whose choices no longer fit the piece", () => {
    // Personalisation made required since: the line has no names.
    const offer: Offer = { ...card, personalisation: { ...card.personalisation!, required: true } };
    const review = reviewBasket([line({ stored: { ...PLAIN, packId: "p3", message: "Blank inside" }, product: product({ offer }) })]);

    expect(review.lines).toEqual([]);
    expect(review.changes).toEqual(["The choices for Red Christmas Reindeer Card have changed, so we've taken it out of your basket. Please choose again."]);
  });

  it("shares stock between lines of the same piece, in the order they went in", () => {
    const blank = { ...PLAIN, packId: null, message: "Blank inside" as const };
    const printed = { ...PLAIN, packId: null, message: "Printed message" as const, messageText: "Hi" };
    const shared = product({ stock: 3, offer: card, saleName: null });
    const review = reviewBasket([
      line({ id: "a", quantity: 2, addedPricePence: 750, stored: blank, product: shared }),
      line({ id: "b", quantity: 2, addedPricePence: 830, stored: printed, product: shared }),
    ]);

    expect(review.lines.map((l) => l.quantity)).toEqual([2, 1]);
    expect(review.changes).toEqual(["There are only enough of Red Christmas Reindeer Card left for 1, so we've changed your 2 to 1."]);
    expect(review.updates).toEqual([{ id: "b", quantity: 1 }]);
  });

  it("counts a pack of three as three of the card's stock", () => {
    const review = reviewBasket([
      line({ quantity: 2, addedPricePence: 1950, stored: { ...PLAIN, packId: "p3", message: "Blank inside" }, product: product({ stock: 4, offer: card, saleName: null }) }),
    ]);

    expect(review.lines[0].quantity).toBe(1);
  });

  it("takes out a piece that has sold out", () => {
    const review = reviewBasket([line({ product: product({ stock: 0 }) })]);

    expect(review.lines).toEqual([]);
    expect(review.changes).toEqual(["Red Christmas Reindeer Card has sold out, so we've taken it out of your basket."]);
  });

  it("counts clothing's stock by colour and size, and names them", () => {
    const review = reviewBasket([
      line({ quantity: 2, addedPricePence: 4500, stored: { ...PLAIN, variantId: "v-pol-2" }, product: product({ name: "Merino Hat", offer: hat, variants: hatVariants, saleName: null }) }),
    ]);

    expect(review.lines[0]).toMatchObject({ quantity: 1, variantId: "v-pol-2", variantName: "Polar / 2-3 years", sku: "REIN-1" });
    expect(review.changes).toEqual(["There are only enough of Merino Hat in Polar / 2-3 years left for 1, so we've changed your 2 to 1."]);
  });

  it("uses the variant's own code when it has one", () => {
    const review = reviewBasket([
      line({ addedPricePence: 4500, stored: { ...PLAIN, variantId: "v-sea-2" }, product: product({ offer: hat, variants: hatVariants, saleName: null }) }),
    ]);

    expect(review.lines[0].sku).toBe("HAT-SEA-2");
  });

  it("never runs out of a piece made to order", () => {
    const review = reviewBasket([line({ quantity: 40, product: product({ stock: 0, madeToOrder: true, leadTimeDays: 14 }) })]);

    expect(review.lines[0]).toMatchObject({ quantity: 40, maxQuantity: 99, madeToOrder: true, leadTimeDays: 14 });
  });

  it("holds only one of a one-of-a-kind piece", () => {
    const review = reviewBasket([line({ quantity: 2, product: product({ oneOfAKind: true }) })]);

    expect(review.lines[0]).toMatchObject({ quantity: 1, maxQuantity: 1 });
    expect(review.changes).toEqual(["Red Christmas Reindeer Card is one of a kind, so your basket can hold only one."]);
  });

  it("tells each line how many it could hold, after the lines sharing its stock", () => {
    const shared = product({ stock: 5 });
    const review = reviewBasket([line({ id: "a", quantity: 2, product: shared }), line({ id: "b", quantity: 1, stored: { ...PLAIN, message: null }, product: shared })]);

    // Five in stock, three in the basket: each line could take two more.
    expect(review.lines.map((l) => l.maxQuantity)).toEqual([4, 3]);
  });

  it("names a line's choices for the basket to show", () => {
    const review = reviewBasket([line({ addedPricePence: 4500, stored: { ...PLAIN, variantId: "v-sea-2" }, product: product({ offer: hat, variants: hatVariants, saleName: null }) })]);

    expect(review.lines[0].details).toEqual([
      { label: "Colour", value: "Seascape" },
      { label: "Size", value: "2-3 years" },
    ]);
  });
});

describe("roomFor", () => {
  it("is how many more of a piece the basket could take", () => {
    const shared = product({ stock: 5 });

    expect(roomFor([], { stored: PLAIN, product: shared })).toBe(5);
    expect(roomFor([line({ quantity: 3, product: shared })], { stored: PLAIN, product: shared })).toBe(2);
  });

  it("is none for a one-of-a-kind piece already in the basket, and 99 for one made to order", () => {
    const one = product({ oneOfAKind: true });
    expect(roomFor([line({ product: one })], { stored: PLAIN, product: one })).toBe(0);

    const made = product({ madeToOrder: true, stock: 0 });
    expect(roomFor([], { stored: PLAIN, product: made })).toBe(99);
  });

  it("counts packs against the cards in stock", () => {
    const shared = product({ stock: 7, offer: card });
    expect(roomFor([], { stored: { ...PLAIN, packId: "p3", message: "Blank inside" }, product: shared })).toBe(2);
  });
});

describe("fitsOffer", () => {
  it("is true for choices the piece still offers, out of stock or not", () => {
    expect(fitsOffer(hat, { ...PLAIN, variantId: "v-sea-3" }, hatVariants)).toBe(true);
    expect(fitsOffer(card, { ...PLAIN, packId: "p3", message: "Blank inside" }, [])).toBe(true);
  });

  it("is false for a pack, field or variant the piece no longer has, or for what the choices would not keep", () => {
    expect(fitsOffer(card, { ...PLAIN, packId: "p9", message: "Blank inside" }, [])).toBe(false);
    expect(fitsOffer(hat, { ...PLAIN, variantId: "gone" }, hatVariants)).toBe(false);
    // Words kept for a card left blank inside: not something this page would ever have stored.
    expect(fitsOffer(card, { ...PLAIN, message: "Blank inside", messageText: "sneaked in" }, [])).toBe(false);
  });
});
