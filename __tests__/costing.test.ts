import {
  NOTHS_FEE_PERCENT,
  discountLadder,
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

  it("charges exactly what a sale of that size would", () => {
    // The ladder uses the shop's own discount rounding, so "at 20% off you
    // make £4.46" is true of a real 20% sale, not an approximation of one.
    const step = discountLadder({ pricePence: 815, costPence: 300, vatRate: 20 })[1];

    expect(step.salePricePence).toBe(815 - Math.round((815 * 20) / 100));
  });
});
