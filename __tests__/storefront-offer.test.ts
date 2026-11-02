import { productOffer, type OfferSource } from "@/lib/storefront/offer";

const categories = [
  { id: "cards", slug: "cards", parentId: null },
  { id: "xmas", slug: "christmas-cards", parentId: "cards" },
  { id: "clothes", slug: "clothes", parentId: null },
  { id: "coats", slug: "coats", parentId: "clothes" },
  { id: "home", slug: "home", parentId: null },
];

const now = new Date("2026-11-01T12:00:00Z");

function source(overrides: Partial<OfferSource> = {}): OfferSource {
  return {
    pricePence: 750,
    compareAtPence: null,
    colours: [],
    sizes: [],
    madeToOrder: false,
    madeOnOrder: false,
    variants: [],
    customisation: null,
    personalisationFields: [],
    packs: [],
    sales: [],
    categoryIds: [],
    ...overrides,
  };
}

describe("productOffer", () => {
  it("offers a card's packs, message and personalisation, priced as the shop sells them now", () => {
    const { offer, clothes } = productOffer(
      source({
        categoryIds: ["xmas"],
        customisation: {
          message: true,
          messagePricePence: 80,
          messageMaxLength: 200,
          personalisation: true,
          personalisationPricePence: 0,
          personalisationRequired: true,
        },
        personalisationFields: [{ id: "f1", label: "Names", kind: "TEXT", maxLength: 30, choices: [], position: 0 }],
        packs: [{ id: "p3", cards: 3, pricePence: 1950, position: 0 }],
      }),
      categories,
      now,
    );

    expect(clothes).toBe(false);
    expect(offer.noun).toEqual({ one: "card", many: "cards" });
    expect(offer.packs).toEqual([{ id: "p3", cards: 3, pricePence: 1950, wasPence: null }]);
    expect(offer.message).toEqual({ pricePence: 80, maxLength: 200 });
    expect(offer.personalisation?.fields.map((field) => field.label)).toEqual(["Names"]);
  });

  it("offers clothing's colours and sizes, with their stock", () => {
    const { offer, clothes } = productOffer(
      source({
        categoryIds: ["coats"],
        sizes: ["2-3 years", "3-4 years"],
        variants: [
          { colour: null, size: "2-3 years", stock: 2 },
          { colour: null, size: "3-4 years", stock: 0 },
        ],
      }),
      categories,
      now,
    );

    expect(clothes).toBe(true);
    expect(offer.clothing?.sizes).toEqual(["2-3 years", "3-4 years"]);
    expect(offer.clothing?.stock).toHaveLength(2);
    expect(offer.clothing?.unlimited).toBe(false);
  });

  it("never runs clothing made on order out of stock", () => {
    const { offer } = productOffer(
      source({ categoryIds: ["coats"], sizes: ["2-3 years"], madeOnOrder: true, variants: [{ colour: null, size: "2-3 years", stock: 0 }] }),
      categories,
      now,
    );

    expect(offer.clothing?.unlimited).toBe(true);
  });

  it("offers any piece's colours, with their stock - a hairband as much as a coat", () => {
    const { offer, clothes } = productOffer(
      source({
        categoryIds: ["home"],
        colours: ["Pink", "Quarry Tile"],
        variants: [
          { colour: "Pink", size: null, stock: 2 },
          { colour: "Quarry Tile", size: null, stock: 0 },
        ],
      }),
      categories,
      now,
    );

    expect(clothes).toBe(false);
    expect(offer.clothing).toEqual({
      colours: ["Pink", "Quarry Tile"],
      sizes: [],
      stock: [
        { colour: "Pink", size: null, stock: 2 },
        { colour: "Quarry Tile", size: null, stock: 0 },
      ],
      unlimited: false,
    });
  });

  it("offers sizes only on clothing: a piece outside Clothes is sold in its colours alone, its sizes kept for nobody", () => {
    const { offer } = productOffer(
      source({
        categoryIds: ["home"],
        colours: ["Tarn"],
        sizes: ["80 x 70 cm"],
        variants: [
          { colour: "Tarn", size: "80 x 70 cm", stock: 4 },
          { colour: "Tarn", size: null, stock: 1 },
        ],
      }),
      categories,
      now,
    );

    expect(offer.clothing?.sizes).toEqual([]);
    expect(offer.clothing?.stock).toEqual([{ colour: "Tarn", size: null, stock: 1 }]);
  });

  it("offers nothing to choose for a piece outside Clothes in sizes alone", () => {
    const { offer } = productOffer(
      source({ categoryIds: ["home"], sizes: ["1-2 years"], variants: [{ colour: null, size: "1-2 years", stock: 1 }] }),
      categories,
      now,
    );

    expect(offer.clothing).toBeNull();
  });

  it("offers nothing to choose for anything else, at its price in a live sale", () => {
    const sale = { id: "s", type: "PERCENTAGE" as const, value: 20, startsAt: new Date("2026-10-01"), endsAt: null, active: true };
    const { offer } = productOffer(source({ categoryIds: ["home"], sales: [sale] }), categories, now);

    expect(offer.single).toEqual({ pricePence: 600, wasPence: 750 });
    expect(offer.packs).toEqual([]);
    expect(offer.message).toBeNull();
    expect(offer.personalisation).toBeNull();
    expect(offer.clothing).toBeNull();
  });

  it("does not offer a card's extras on a piece that has left Cards", () => {
    const { offer } = productOffer(
      source({
        categoryIds: ["home"],
        customisation: {
          message: true,
          messagePricePence: 80,
          messageMaxLength: 200,
          personalisation: false,
          personalisationPricePence: 0,
          personalisationRequired: false,
        },
        packs: [{ id: "p3", cards: 3, pricePence: 1950, position: 0 }],
      }),
      categories,
      now,
    );

    expect(offer.message).toBeNull();
    expect(offer.packs).toEqual([]);
  });
});
