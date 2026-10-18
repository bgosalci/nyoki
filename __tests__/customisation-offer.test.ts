import { offersAnything, toOffer } from "@/lib/customisation/offer";

const card = { one: "card", many: "cards" };
const now = new Date("2026-10-18T12:00:00Z");
const product = { pricePence: 550, compareAtPence: null };

const twentyOff = {
  id: "s1",
  type: "PERCENTAGE" as const,
  value: 20,
  startsAt: new Date("2026-10-01T00:00:00Z"),
  endsAt: null,
  active: true,
};

const customisation = {
  message: true,
  messagePricePence: 80,
  messageMaxLength: 250,
  personalisation: true,
  personalisationPricePence: 150,
  personalisationRequired: false,
};

const fields = [
  { id: "f2", label: "Zodiac sign", kind: "CHOICE" as const, maxLength: null, choices: ["♈ Aries", "♉ Taurus"], position: 1 },
  { id: "f1", label: "Name", kind: "TEXT" as const, maxLength: 20, choices: [], position: 0 },
];

const packs = [
  { id: "p6", cards: 6, pricePence: 2700, position: 1 },
  { id: "p3", cards: 3, pricePence: 1500, position: 0 },
];

describe("toOffer", () => {
  it("offers the single card at the product's price", () => {
    const offer = toOffer({ product, customisation: null, fields: [], packs: [], sales: [], noun: card, now });

    expect(offer.single).toEqual({ pricePence: 550, wasPence: null });
  });

  it("shows the product's was-price beside the single card", () => {
    const offer = toOffer({ product: { pricePence: 550, compareAtPence: 650 }, customisation: null, fields: [], packs: [], sales: [], noun: card, now });

    expect(offer.single).toEqual({ pricePence: 550, wasPence: 650 });
  });

  it("offers the packs in the order they were set, at their own prices", () => {
    const offer = toOffer({ product, customisation: null, fields: [], packs, sales: [], noun: card, now });

    expect(offer.packs).toEqual([
      { id: "p3", cards: 3, pricePence: 1500, wasPence: null },
      { id: "p6", cards: 6, pricePence: 2700, wasPence: null },
    ]);
  });

  it("takes a live sale off the single card and every pack, showing what each was", () => {
    const offer = toOffer({ product, customisation: null, fields: [], packs, sales: [twentyOff], noun: card, now });

    expect(offer.single).toEqual({ pricePence: 440, wasPence: 550 });
    expect(offer.packs).toEqual([
      { id: "p3", cards: 3, pricePence: 1200, wasPence: 1500 },
      { id: "p6", cards: 6, pricePence: 2160, wasPence: 2700 },
    ]);
  });

  it("leaves the message and personalisation charges out of a sale", () => {
    const offer = toOffer({ product, customisation, fields, packs: [], sales: [twentyOff], noun: card, now });

    expect(offer.message?.pricePence).toBe(80);
    expect(offer.personalisation?.pricePence).toBe(150);
  });

  it("offers the printed message as set", () => {
    const offer = toOffer({ product, customisation, fields, packs: [], sales: [], noun: card, now });

    expect(offer.message).toEqual({ pricePence: 80, maxLength: 250 });
  });

  it("offers personalisation with its fields in the order they were set", () => {
    const offer = toOffer({ product, customisation, fields, packs: [], sales: [], noun: card, now });

    expect(offer.personalisation).toEqual({
      pricePence: 150,
      required: false,
      fields: [
        { id: "f1", label: "Name", kind: "TEXT", maxLength: 20, choices: [] },
        { id: "f2", label: "Zodiac sign", kind: "CHOICE", maxLength: null, choices: ["♈ Aries", "♉ Taurus"] },
      ],
    });
  });

  it("offers nothing switched off, whatever its settings say", () => {
    const off = { ...customisation, message: false, personalisation: false };
    const offer = toOffer({ product, customisation: off, fields, packs: [], sales: [], noun: card, now });

    expect(offer.message).toBeNull();
    expect(offer.personalisation).toBeNull();
  });

  it("offers no personalisation with nothing to personalise", () => {
    const offer = toOffer({ product, customisation, fields: [], packs: [], sales: [], noun: card, now });

    expect(offer.personalisation).toBeNull();
  });

  it("carries what the piece is called, for the page's words", () => {
    const offer = toOffer({ product, customisation: null, fields: [], packs: [], sales: [], noun: { one: "bookmark", many: "bookmarks" }, now });

    expect(offer.noun).toEqual({ one: "bookmark", many: "bookmarks" });
  });
});

describe("offersAnything", () => {
  const base = { product, fields: [], packs: [], sales: [], noun: card, now };

  it("is false for a card with nothing set", () => {
    expect(offersAnything(toOffer({ ...base, customisation: null }))).toBe(false);
  });

  it("is true for packs alone, a message alone, or personalisation alone", () => {
    expect(offersAnything(toOffer({ ...base, customisation: null, packs }))).toBe(true);
    expect(offersAnything(toOffer({ ...base, customisation: { ...customisation, personalisation: false } }))).toBe(true);
    expect(offersAnything(toOffer({ ...base, customisation: { ...customisation, message: false }, fields }))).toBe(true);
  });
});
