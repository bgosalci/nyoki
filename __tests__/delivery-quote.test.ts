import { DELIVERY_DEFAULTS, type RateSource } from "@/lib/delivery/parcel";
import { quoteFor, quoteSentence } from "@/lib/delivery/quote";
import { royalMailService } from "@/lib/delivery/royal-mail";

const rates: RateSource[] = [
  { id: "t24", name: "Royal Mail Tracked 24", pricePence: 550, freeOverPence: null, minDays: 1, maxDays: 2, byWeight: true, bands: royalMailService("tracked-24")!.bands },
  { id: "t48", name: "Royal Mail Tracked 48", pricePence: 395, freeOverPence: 4000, minDays: 2, maxDays: 3, byWeight: true, bands: royalMailService("tracked-48")!.bands },
];
const woodenCard = { grams: 62, size: "LARGE_LETTER" as const, mm: 8, weighed: true };

describe("quoteFor", () => {
  it("is what one piece costs to send on its own, cheapest first", () => {
    expect(quoteFor(woodenCard, 1, rates, DELIVERY_DEFAULTS.packing)).toEqual({
      packed: { size: "LARGE_LETTER", grams: 102, mm: 10 },
      prices: [
        { name: "Royal Mail Tracked 48", pricePence: 290 },
        { name: "Royal Mail Tracked 24", pricePence: 390 },
      ],
    });
  });

  it("is what a pack costs: three wooden cards are too thick for a Large Letter", () => {
    expect(quoteFor(woodenCard, 3, rates, DELIVERY_DEFAULTS.packing)).toEqual({
      packed: { size: "SMALL_PARCEL", grams: 296, mm: null },
      prices: [
        { name: "Royal Mail Tracked 48", pricePence: 375 },
        { name: "Royal Mail Tracked 24", pricePence: 480 },
      ],
    });
  });

  it("goes by Royal Mail's own limits when no option is priced by size and weight", () => {
    const flat = rates.map((rate) => ({ ...rate, byWeight: false }));
    expect(quoteFor(woodenCard, 1, flat, DELIVERY_DEFAULTS.packing)?.packed).toEqual({ size: "LARGE_LETTER", grams: 102, mm: 10 });
  });
});

describe("quoteSentence", () => {
  it("says the size, the weight packed and a letter's thickness, then each price", () => {
    expect(quoteSentence(quoteFor(woodenCard, 1, rates, DELIVERY_DEFAULTS.packing)!)).toBe(
      "Large Letter, 102 g and 10 mm packed. £2.90 by Royal Mail Tracked 48, £3.90 by Royal Mail Tracked 24.",
    );
    expect(quoteSentence(quoteFor(woodenCard, 3, rates, DELIVERY_DEFAULTS.packing)!)).toBe(
      "Small Parcel, 296 g packed. £3.75 by Royal Mail Tracked 48, £4.80 by Royal Mail Tracked 24.",
    );
  });

  it("says when nothing is offered for it", () => {
    expect(quoteSentence({ packed: { size: "MEDIUM_PARCEL", grams: 21300, mm: null }, prices: [] })).toBe(
      "Medium Parcel, 21300 g packed. No delivery option takes it.",
    );
  });
});
