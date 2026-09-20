import {
  activeSaleFor,
  discountPenceFor,
  effectivePricePence,
  type PricingSale,
} from "@/lib/pricing";

const NOW = new Date("2026-06-15T12:00:00Z");

function sale(overrides: Partial<PricingSale> = {}): PricingSale {
  return {
    id: "sale_1",
    type: "PERCENTAGE",
    value: 20,
    startsAt: new Date("2026-06-01T00:00:00Z"),
    endsAt: new Date("2026-06-30T00:00:00Z"),
    active: true,
    ...overrides,
  };
}

describe("discountPenceFor", () => {
  it("takes a percentage off", () => {
    expect(discountPenceFor(1000, sale({ type: "PERCENTAGE", value: 20 }))).toBe(200);
  });

  it("takes a fixed amount off", () => {
    expect(
      discountPenceFor(1000, sale({ type: "FIXED_AMOUNT", value: 250 })),
    ).toBe(250);
  });

  it("rounds a fractional percentage to the nearest penny", () => {
    // 20% of 999p = 199.8p
    expect(discountPenceFor(999, sale({ type: "PERCENTAGE", value: 20 }))).toBe(200);
  });

  it("never discounts more than the price", () => {
    expect(
      discountPenceFor(500, sale({ type: "FIXED_AMOUNT", value: 900 })),
    ).toBe(500);
  });

  it("never returns a negative discount", () => {
    expect(
      discountPenceFor(500, sale({ type: "FIXED_AMOUNT", value: -100 })),
    ).toBe(0);
  });

  it("clamps a percentage above 100", () => {
    expect(discountPenceFor(1000, sale({ type: "PERCENTAGE", value: 150 }))).toBe(1000);
  });
});

describe("activeSaleFor", () => {
  it("returns null when there are no sales", () => {
    expect(activeSaleFor([], 1000, NOW)).toBeNull();
  });

  it("ignores a sale that has not started", () => {
    const future = sale({ startsAt: new Date("2026-07-01T00:00:00Z") });
    expect(activeSaleFor([future], 1000, NOW)).toBeNull();
  });

  it("ignores a sale that has ended", () => {
    const past = sale({ endsAt: new Date("2026-06-01T00:00:00Z") });
    expect(activeSaleFor([past], 1000, NOW)).toBeNull();
  });

  it("ignores a sale switched off", () => {
    expect(activeSaleFor([sale({ active: false })], 1000, NOW)).toBeNull();
  });

  it("treats a null end date as running indefinitely", () => {
    const open = sale({ endsAt: null });
    expect(activeSaleFor([open], 1000, NOW)?.id).toBe("sale_1");
  });

  it("picks the sale that saves the customer the most", () => {
    const ten = sale({ id: "ten", type: "PERCENTAGE", value: 10 });
    const fiver = sale({ id: "fiver", type: "FIXED_AMOUNT", value: 500 });
    // On a £10 item: 10% = 100p, £5 off = 500p. The fixed one wins.
    expect(activeSaleFor([ten, fiver], 1000, NOW)?.id).toBe("fiver");
  });

  it("is inclusive of the exact start instant", () => {
    const startsNow = sale({ startsAt: NOW });
    expect(activeSaleFor([startsNow], 1000, NOW)?.id).toBe("sale_1");
  });

  it("is exclusive of the exact end instant", () => {
    const endsNow = sale({ endsAt: NOW });
    expect(activeSaleFor([endsNow], 1000, NOW)).toBeNull();
  });
});

describe("effectivePricePence", () => {
  it("hands back the caller's own sale row, so its other fields survive", () => {
    // The page needs the sale's name to show it; the pricing module only
    // cares about type, value and dates, and must not narrow it away.
    const named = { ...sale(), name: "Spring sale" };

    const result = effectivePricePence(1000, [named], NOW);

    expect(result.sale).toBe(named);
    expect(result.sale?.name).toBe("Spring sale");
  });


  it("returns the base price when no sale applies", () => {
    expect(effectivePricePence(1000, [], NOW)).toEqual({
      pricePence: 1000,
      basePricePence: 1000,
      discountPence: 0,
      sale: null,
    });
  });

  it("applies the best active sale", () => {
    const result = effectivePricePence(1000, [sale()], NOW);
    expect(result.pricePence).toBe(800);
    expect(result.discountPence).toBe(200);
    expect(result.sale?.id).toBe("sale_1");
  });

  it("never produces a negative price", () => {
    const huge = sale({ type: "FIXED_AMOUNT", value: 999999 });
    expect(effectivePricePence(1000, [huge], NOW).pricePence).toBe(0);
  });
});
