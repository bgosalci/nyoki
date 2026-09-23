import { parsePricingView, pricingRow, pricingSummary, type PricingRow } from "@/lib/costing/list";

const product = (overrides: Partial<Parameters<typeof pricingRow>[0]> = {}) => ({
  id: "p1",
  name: "Christening Card",
  image: null,
  pricePence: 1299,
  vatRate: 20,
  costLines: [
    { unitPence: 220, quantityHundredths: 100 },
    { unitPence: 200, quantityHundredths: 100 },
  ],
  ...overrides,
});

describe("pricingRow", () => {
  it("works out what a costed piece makes", () => {
    expect(pricingRow(product())).toMatchObject({
      costed: true,
      costPence: 420,
      profitPence: 662,
    });
  });

  it("makes no claim about the profit of a piece not yet costed", () => {
    // Without costs, "profit" would be the whole price after VAT - a figure
    // that reads as wonderful and means nothing.
    const row = pricingRow(product({ costLines: [] }));

    expect(row.costed).toBe(false);
    expect(row.profitPence).toBeNull();
    expect(row.costMultiple).toBeNull();
  });
});

describe("parsePricingView", () => {
  it("shows everything unless told otherwise", () => {
    expect(parsePricingView({})).toEqual({ q: "", view: "all" });
  });

  it("reads the two views worth narrowing to", () => {
    expect(parsePricingView({ view: "uncosted" }).view).toBe("uncosted");
    expect(parsePricingView({ view: "loss" }).view).toBe("loss");
  });

  it("ignores a view it does not know, rather than showing nothing", () => {
    expect(parsePricingView({ view: "cheap" }).view).toBe("all");
  });

  it("trims the search", () => {
    expect(parsePricingView({ q: "  snail " }).q).toBe("snail");
  });
});

describe("pricingSummary", () => {
  const rows: PricingRow[] = [
    pricingRow(product({ id: "a" })),
    pricingRow(product({ id: "b", costLines: [] })),
    pricingRow(product({ id: "c", pricePence: 400 })), // costs £4.20, sells for £4.00
  ];

  it("counts what has been costed and what is losing money", () => {
    expect(pricingSummary(rows)).toEqual({ total: 3, costed: 2, atALoss: 1 });
  });
});
