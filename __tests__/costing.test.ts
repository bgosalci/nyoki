import {
  NOTHS_FEE_PERCENT,
  discountLadder,
  marginPercent,
  priceForMargin,
  roundUpToEnding,
  lineCostPence,
  nothsBreakdown,
  priceBreakdown,
  productionCostPence,
} from "@/lib/costing/costing";

// Every fixture here is a row from Njomza's 2023 price lists, so these tests
// prove the admin works a price out the way her spreadsheet does.

describe("lineCostPence", () => {
  it("prices a single item at its unit cost", () => {
    expect(lineCostPence({ unitPence: 22, quantityHundredths: 100 })).toBe(22);
  });

  it("prices half skeins exactly, since yarn is bought that way", () => {
    // Clothes, Spring/Summer: bamboo at £1.76 a skein, 6.5 skeins.
    expect(lineCostPence({ unitPence: 176, quantityHundredths: 650 })).toBe(1144);
  });

  it("rounds a line once, to the nearest penny", () => {
    expect(lineCostPence({ unitPence: 3, quantityHundredths: 50 })).toBe(2); // 1.5p
  });
});

describe("productionCostPence", () => {
  it("adds up what goes into a piece", () => {
    // Cards, Christening: card & envelope, bag, ink, P&P, making (£2).
    const lines = [80, 9, 25, 106, 200].map((unitPence) => ({ unitPence, quantityHundredths: 100 }));

    expect(productionCostPence(lines)).toBe(420);
  });

  it("is nothing for a piece not yet costed", () => {
    expect(productionCostPence([])).toBe(0);
  });
});

describe("priceBreakdown", () => {
  // Cards, Christening: £12.99 inc VAT at 20%, costing £4.20.
  const christening = { pricePence: 1299, costPence: 420, vatRate: 20 };

  it("takes the VAT out with the VAT fraction, as HMRC works it", () => {
    // 1299 x 20/120 = 216.5, rounded to the nearest penny.
    expect(priceBreakdown(christening).vatPence).toBe(217);
    expect(priceBreakdown(christening).exVatPence).toBe(1082);
  });

  it("makes the profit what is kept after VAT and costs", () => {
    expect(priceBreakdown(christening).profitPence).toBe(662);
  });

  it("gives the cost multiple her sheet calls the online margin", () => {
    // £10.82 kept on £4.20 of cost.
    expect(priceBreakdown(christening).costMultiple).toBeCloseTo(2.576, 3);
  });

  it("leaves zero-rated pieces with no VAT to take out", () => {
    // Clothes, Spring/Summer: £65.00, costing £26.35, children's clothing.
    const vest = priceBreakdown({ pricePence: 6500, costPence: 2635, vatRate: 0 });

    expect(vest.vatPence).toBe(0);
    expect(vest.profitPence).toBe(3865);
  });

  it("has no multiple for a piece that has not been costed, rather than dividing by nothing", () => {
    expect(priceBreakdown({ pricePence: 890, costPence: 0, vatRate: 20 }).costMultiple).toBeNull();
  });

  it("shows a loss as a loss", () => {
    // Accessories, Hairclips: a 3-pack at £13.00 costing £13.17.
    expect(priceBreakdown({ pricePence: 1300, costPence: 1317, vatRate: 20 }).profitPence).toBeLessThan(0);
  });
});

describe("nothsBreakdown", () => {
  it("takes the commission off the price the shopper pays", () => {
    // Christening on Not On The High Street: 30% of £12.99.
    const noths = nothsBreakdown({ pricePence: 1299, costPence: 420, vatRate: 20 });

    expect(NOTHS_FEE_PERCENT).toBe(30);
    expect(noths.feePence).toBe(390);
    expect(noths.profitPence).toBe(1299 - 390 - 217 - 420);
  });
});

describe("discountLadder", () => {
  const christening = { pricePence: 1299, costPence: 420, vatRate: 20 };

  it("works out the price and the profit at each step down", () => {
    const [ten, twenty] = discountLadder(christening);

    expect(ten).toMatchObject({ percent: 10, salePricePence: 1169 });
    // Her sheet: £10.39 at 20% off, leaving £4.46.
    expect(twenty).toMatchObject({ percent: 20, salePricePence: 1039, profitPence: 446 });
  });

  it("goes down to half price, where her lists stop", () => {
    expect(discountLadder(christening).map((step) => step.percent)).toEqual([10, 20, 30, 40, 50]);
  });

  it("works out what Not On The High Street leaves at each step as well", () => {
    // Same sale price there; their 30% comes off it, so less is left.
    const twenty = discountLadder(christening)[1];
    const noths = nothsBreakdown({ ...christening, pricePence: twenty.salePricePence });

    expect(twenty.nothsProfitPence).toBe(noths.profitPence);
    expect(twenty.nothsProfitPence).toBeLessThan(twenty.profitPence);
  });

  it("charges exactly what a sale of that size would", () => {
    // The ladder uses the shop's own discount rounding, so "at 20% off you
    // make £4.46" is true of a real 20% sale, not an approximation of one.
    const step = discountLadder({ pricePence: 815, costPence: 300, vatRate: 20 })[1];

    expect(step.salePricePence).toBe(815 - Math.round((815 * 20) / 100));
  });
});

// "A New Life To Celebrate Card - Pink": £2.74 to make, at 20% VAT.
const card = { costPence: 274, vatRate: 20 };

describe("marginPercent", () => {
  it("is the profit as a share of what is kept after VAT", () => {
    // £5.50: £0.92 VAT, £4.58 kept, £1.84 profit - 40.2%.
    expect(marginPercent(priceBreakdown({ ...card, pricePence: 550 }))).toBeCloseTo(40.17, 2);
  });

  it("has nothing to say about a piece with nothing kept", () => {
    expect(marginPercent(priceBreakdown({ ...card, pricePence: 0 }))).toBeNull();
  });
});

describe("roundUpToEnding", () => {
  it("goes up to the next price ending in 99p", () => {
    expect(roundUpToEnding(822, "99")).toBe(899);
    expect(roundUpToEnding(899, "99")).toBe(899);
  });

  it("goes up to the next price ending in 50p", () => {
    expect(roundUpToEnding(822, "50")).toBe(850);
    expect(roundUpToEnding(851, "50")).toBe(950);
  });

  it("goes to whichever of the two comes first", () => {
    expect(roundUpToEnding(822, "either")).toBe(850);
    expect(roundUpToEnding(851, "either")).toBe(899);
    expect(roundUpToEnding(900, "either")).toBe(950);
  });
});

describe("priceForMargin", () => {
  it("finds the price that leaves the margin asked for", () => {
    // 40% of what is kept: the card comes out at £5.50, where it is now.
    expect(priceForMargin({ ...card, marginTenths: 400, ending: "either" })).toBe(550);
  });

  it("rounds up, never down, so a tidy price cannot cost margin", () => {
    // 60% needs £8.22; the next tidy price is £8.50.
    expect(priceForMargin({ ...card, marginTenths: 600, ending: "either" })).toBe(850);
    expect(priceForMargin({ ...card, marginTenths: 600, ending: "99" })).toBe(899);
  });

  it("takes no VAT into account for a zero-rated piece", () => {
    // £26.35 of cost at 50% margin: £52.70, up to £52.99.
    expect(priceForMargin({ costPence: 2635, vatRate: 0, marginTenths: 500, ending: "99" })).toBe(5299);
  });

  it("always leaves at least the margin asked for, whatever the numbers", () => {
    // VAT is rounded to the penny, so a price that looks right on paper can
    // fall a hair short. Every answer is checked, and stepped up if so.
    for (const costPence of [1, 37, 99, 274, 1317, 2635]) {
      for (const vatRate of [0, 5, 20]) {
        for (const marginTenths of [0, 125, 400, 555, 600, 900]) {
          for (const ending of ["99", "50", "either"] as const) {
            const price = priceForMargin({ costPence, vatRate, marginTenths, ending })!;
            const { profitPence, exVatPence } = priceBreakdown({ pricePence: price, costPence, vatRate });

            expect(profitPence * 1000).toBeGreaterThanOrEqual(marginTenths * exVatPence);
            expect([50, 99]).toContain(price % 100);
          }
        }
      }
    }
  });

  it("cannot work from a margin with no costs to work from", () => {
    expect(priceForMargin({ costPence: 0, vatRate: 20, marginTenths: 500, ending: "99" })).toBeNull();
  });

  it("refuses a margin of 100% or more, which no price can reach", () => {
    expect(priceForMargin({ ...card, marginTenths: 1000, ending: "99" })).toBeNull();
  });
});
