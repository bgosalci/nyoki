import {
  DELIVERY_DEFAULTS,
  naturalSize,
  parcelOf,
  postageOf,
  priceRates,
  sendBy,
  withUsual,
  type Postage,
  type RateSource,
} from "@/lib/delivery/parcel";
import { royalMailService, type Band } from "@/lib/delivery/royal-mail";

const packing = DELIVERY_DEFAULTS.packing;
const tracked48 = royalMailService("tracked-48")!.bands;
const tracked24 = royalMailService("tracked-24")!.bands;
const secondClass = royalMailService("2nd-class")!.bands;

// The pieces from the plan: cards at their category's usual, one card weighed.
const reindeer: Postage = { grams: 40, size: "LARGE_LETTER", mm: 5, weighed: true };
const woodenCard: Postage = { grams: 62, size: "LARGE_LETTER", mm: 8, weighed: true };
const hat: Postage = { grams: 100, size: "SMALL_PARCEL", mm: 0, weighed: true };

describe("withUsual", () => {
  it("takes each part from the piece, and what the piece does not say from its category", () => {
    expect(withUsual({ grams: 38, size: null, mm: 12 }, { grams: 40, size: "LARGE_LETTER", mm: 5 })).toEqual({ grams: 38, size: "LARGE_LETTER", mm: 12 });
  });

  it("is the piece's own where there is no usual", () => {
    expect(withUsual({ grams: 100, size: null, mm: null }, null)).toEqual({ grams: 100, size: null, mm: null });
  });
});

describe("postageOf", () => {
  it("is what the piece says, weighed", () => {
    expect(postageOf({ grams: 62, size: "LARGE_LETTER", mm: 8 }, DELIVERY_DEFAULTS)).toEqual(woodenCard);
  });

  it("counts a piece not weighed as the set weight and size", () => {
    expect(postageOf({ grams: null, size: null, mm: null }, DELIVERY_DEFAULTS)).toEqual({ grams: 500, size: "SMALL_PARCEL", mm: 0, weighed: false });
  });

  it("sends a piece with a weight but no size at the not-weighed size", () => {
    expect(postageOf({ grams: 100, size: null, mm: null }, DELIVERY_DEFAULTS)).toEqual(hat);
  });

  it("counts a letter with no thickness as thick as its size allows, never thinner", () => {
    expect(postageOf({ grams: 40, size: "LARGE_LETTER", mm: null }, DELIVERY_DEFAULTS).mm).toBe(25);
    expect(postageOf({ grams: 20, size: "LETTER", mm: null }, DELIVERY_DEFAULTS).mm).toBe(5);
  });

  it("ignores thickness on a parcel", () => {
    expect(postageOf({ grams: 500, size: "SMALL_PARCEL", mm: 40 }, DELIVERY_DEFAULTS).mm).toBe(0);
  });
});

describe("parcelOf", () => {
  it("adds the pieces up: the largest size any needs, the weight, and how thick they stack", () => {
    expect(parcelOf([{ postage: woodenCard, units: 1 }, { postage: reindeer, units: 2 }])).toEqual({ size: "LARGE_LETTER", grams: 142, mm: 18 });
  });

  it("is the parcel's size once a parcel-sized piece is in it", () => {
    expect(parcelOf([{ postage: woodenCard, units: 1 }, { postage: reindeer, units: 2 }, { postage: hat, units: 1 }])).toEqual({
      size: "SMALL_PARCEL",
      grams: 242,
      mm: 18,
    });
  });

  it("is nothing for nothing", () => {
    expect(parcelOf([])).toBeNull();
    expect(parcelOf([{ postage: hat, units: 0 }])).toBeNull();
  });
});

describe("sendBy", () => {
  it("prices three cards as a Large Letter, its envelope added: 182 g, 20 mm, £2.90", () => {
    const parcel = parcelOf([{ postage: woodenCard, units: 1 }, { postage: reindeer, units: 2 }])!;
    expect(sendBy(tracked48, parcel, packing)).toEqual({ size: "LARGE_LETTER", grams: 182, mm: 20, pricePence: 290 });
    expect(sendBy(tracked24, parcel, packing)?.pricePence).toBe(390);
  });

  it("prices three cards and a hat as a Small Parcel, its box added: 352 g, £3.75", () => {
    const parcel = parcelOf([{ postage: woodenCard, units: 1 }, { postage: reindeer, units: 2 }, { postage: hat, units: 1 }])!;
    expect(sendBy(tracked48, parcel, packing)).toEqual({ size: "SMALL_PARCEL", grams: 352, mm: null, pricePence: 375 });
    expect(sendBy(tracked24, parcel, packing)?.pricePence).toBe(480);
  });

  it("sends six cards as a Small Parcel, since 32 mm will not go as a Large Letter", () => {
    const parcel = parcelOf([{ postage: reindeer, units: 6 }])!;
    expect(sendBy(tracked48, parcel, packing)).toEqual({ size: "SMALL_PARCEL", grams: 350, mm: null, pricePence: 375 });
  });

  it("sends a pack of three wooden cards as a Small Parcel: 26 mm with the envelope", () => {
    expect(sendBy(tracked48, parcelOf([{ postage: woodenCard, units: 3 }])!, packing)).toEqual({ size: "SMALL_PARCEL", grams: 296, mm: null, pricePence: 375 });
  });

  it("allows exactly 25 mm as a Large Letter", () => {
    const parcel = parcelOf([{ postage: { ...reindeer, mm: 23 }, units: 1 }])!;
    expect(sendBy(tracked48, parcel, packing)?.size).toBe("LARGE_LETTER");
  });

  it("sends a thin card as a Letter where the option has a Letter price", () => {
    const thin: Postage = { grams: 30, size: "LETTER", mm: 3, weighed: true };
    expect(sendBy(secondClass, parcelOf([{ postage: thin, units: 1 }])!, packing)).toEqual({ size: "LETTER", grams: 40, mm: 4, pricePence: 91 });
  });

  it("sends a letter at the Large Letter price where the option has no Letter price", () => {
    const thin: Postage = { grams: 30, size: "LETTER", mm: 3, weighed: true };
    expect(sendBy(tracked48, parcelOf([{ postage: thin, units: 1 }])!, packing)).toEqual({ size: "LARGE_LETTER", grams: 70, mm: 5, pricePence: 290 });
  });

  it("goes up a size when a letter is too heavy for its Letter price", () => {
    const heavy: Postage = { grams: 120, size: "LETTER", mm: 3, weighed: true };
    expect(sendBy(secondClass, parcelOf([{ postage: heavy, units: 1 }])!, packing)).toEqual({ size: "LARGE_LETTER", grams: 160, mm: 5, pricePence: 190 });
  });

  it("keeps an 800 g Large Letter by Tracked, which takes one to 1 kg, but not by 2nd Class, which takes 750 g", () => {
    const heavy = parcelOf([{ postage: { grams: 760, size: "LARGE_LETTER", mm: 10, weighed: true }, units: 1 }])!;
    expect(sendBy(tracked48, heavy, packing)).toEqual({ size: "LARGE_LETTER", grams: 800, mm: 12, pricePence: 290 });
    expect(sendBy(secondClass, heavy, packing)).toEqual({ size: "SMALL_PARCEL", grams: 870, mm: null, pricePence: 440 });
  });

  it("takes the band the weight is up to and including", () => {
    const exact = parcelOf([{ postage: { grams: 1890, size: "SMALL_PARCEL", mm: 0, weighed: true }, units: 1 }])!;
    expect(sendBy(tracked48, exact, packing)).toEqual({ size: "SMALL_PARCEL", grams: 2000, mm: null, pricePence: 375 });
    const over = parcelOf([{ postage: { grams: 1891, size: "SMALL_PARCEL", mm: 0, weighed: true }, units: 1 }])!;
    expect(sendBy(tracked48, over, packing)).toEqual({ size: "MEDIUM_PARCEL", grams: 2191, mm: null, pricePence: 755 });
  });

  it("finds no price over 20 kg", () => {
    const heavy = parcelOf([{ postage: { grams: 21000, size: "MEDIUM_PARCEL", mm: 0, weighed: true }, units: 1 }])!;
    expect(sendBy(tracked48, heavy, packing)).toBeNull();
  });

  it("takes the cheapest band that fits, however the list is ordered", () => {
    const bands: Band[] = [
      { size: "SMALL_PARCEL", upToGrams: 2000, pricePence: 500 },
      { size: "SMALL_PARCEL", upToGrams: 1000, pricePence: 400 },
    ];
    const parcel = parcelOf([{ postage: hat, units: 1 }])!;
    expect(sendBy(bands, parcel, packing)?.pricePence).toBe(400);
  });
});

describe("naturalSize", () => {
  it("is the smallest size Royal Mail's limits allow, packed", () => {
    const cards = parcelOf([{ postage: woodenCard, units: 1 }, { postage: reindeer, units: 2 }])!;
    expect(naturalSize(cards, packing)).toEqual({ size: "LARGE_LETTER", grams: 182, mm: 20 });
    expect(naturalSize(parcelOf([{ postage: reindeer, units: 6 }])!, packing)).toEqual({ size: "SMALL_PARCEL", grams: 350, mm: null });
  });

  it("goes up a size for weight as well as thickness", () => {
    const heavy = parcelOf([{ postage: { grams: 760, size: "LARGE_LETTER", mm: 10, weighed: true }, units: 1 }])!;
    expect(naturalSize(heavy, packing)).toEqual({ size: "SMALL_PARCEL", grams: 870, mm: null });
  });

  it("is a Medium Parcel however heavy, so an order can still say what it was", () => {
    const heavy = parcelOf([{ postage: { grams: 21000, size: "MEDIUM_PARCEL", mm: 0, weighed: true }, units: 1 }])!;
    expect(naturalSize(heavy, packing)).toEqual({ size: "MEDIUM_PARCEL", grams: 21300, mm: null });
  });
});

describe("priceRates", () => {
  const options: RateSource[] = [
    { id: "t48", name: "Royal Mail Tracked 48", pricePence: 395, freeOverPence: 4000, minDays: 2, maxDays: 3, byWeight: true, bands: tracked48 },
    { id: "t24", name: "Royal Mail Tracked 24", pricePence: 550, freeOverPence: null, minDays: 1, maxDays: 2, byWeight: true, bands: tracked24 },
    { id: "collect", name: "Collect from the studio", pricePence: 0, freeOverPence: null, minDays: null, maxDays: null, byWeight: false, bands: [] },
  ];
  const cards = parcelOf([{ postage: woodenCard, units: 1 }, { postage: reindeer, units: 2 }]);

  it("prices each option by size and weight for this parcel, and keeps a one-price option at its price", () => {
    expect(priceRates(options, cards, packing)).toEqual([
      { id: "t48", name: "Royal Mail Tracked 48", pricePence: 290, freeOverPence: 4000, minDays: 2, maxDays: 3, parcel: { size: "LARGE_LETTER", grams: 182, mm: 20 } },
      { id: "t24", name: "Royal Mail Tracked 24", pricePence: 390, freeOverPence: null, minDays: 1, maxDays: 2, parcel: { size: "LARGE_LETTER", grams: 182, mm: 20 } },
      { id: "collect", name: "Collect from the studio", pricePence: 0, freeOverPence: null, minDays: null, maxDays: null, parcel: { size: "LARGE_LETTER", grams: 182, mm: 20 } },
    ]);
  });

  it("leaves out an option whose price list has no band for the parcel", () => {
    const heavy = parcelOf([{ postage: { grams: 21000, size: "MEDIUM_PARCEL", mm: 0, weighed: true }, units: 1 }]);
    expect(priceRates(options, heavy, packing).map((rate) => rate.id)).toEqual(["collect"]);
  });

  it("offers a by-weight option with no bands at all to no one", () => {
    expect(priceRates([{ ...options[0], bands: [] }], cards, packing)).toEqual([]);
  });

  it("keeps the one price, and no parcel, when there is nothing to send", () => {
    expect(priceRates(options, null, packing).map(({ id, pricePence, parcel }) => [id, pricePence, parcel])).toEqual([
      ["t48", 395, null],
      ["t24", 550, null],
      ["collect", 0, null],
    ]);
  });
});
