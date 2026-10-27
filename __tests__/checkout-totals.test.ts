import { apportion, checkoutTotals, deliveryPence, freeDelivery, type DeliveryRate } from "@/lib/checkout/totals";

const tracked48: DeliveryRate = { id: "t48", name: "Royal Mail Tracked 48", pricePence: 395, freeOverPence: 4000, minDays: 2, maxDays: 3 };
const tracked24: DeliveryRate = { id: "t24", name: "Royal Mail Tracked 24", pricePence: 550, freeOverPence: null, minDays: 1, maxDays: 2 };

describe("deliveryPence", () => {
  it("is the option's price, or nothing once the goods reach its free-over amount", () => {
    expect(deliveryPence(tracked48, 3999)).toBe(395);
    expect(deliveryPence(tracked48, 4000)).toBe(0);
    expect(deliveryPence(tracked24, 100_000)).toBe(550);
  });
});

describe("freeDelivery", () => {
  it("says how much more would make delivery free, by the option that is free soonest", () => {
    expect(freeDelivery([tracked24, tracked48], 750)).toEqual({ reached: false, morePence: 3250, rate: tracked48 });
  });

  it("says when the basket has reached it", () => {
    expect(freeDelivery([tracked24, tracked48], 7490)).toEqual({ reached: true, rate: tracked48 });
  });

  it("is null when no option is ever free", () => {
    expect(freeDelivery([tracked24], 7490)).toBeNull();
    expect(freeDelivery([], 7490)).toBeNull();
  });
});

describe("apportion", () => {
  it("shares a whole number of pence by weight, adding up exactly", () => {
    expect(apportion(749, [2990, 4500])).toEqual([299, 450]);
    expect(apportion(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(apportion(0, [5, 5])).toEqual([0, 0]);
  });

  it("shares evenly when every weight is nothing", () => {
    expect(apportion(10, [0, 0])).toEqual([5, 5]);
  });
});

describe("checkoutTotals", () => {
  // The basket in the designs: a pack of cards, a child's hat (zero-rated) and two sale cards.
  const lines = [
    { totalPence: 2190, vatRate: 20 },
    { totalPence: 4500, vatRate: 0 },
    { totalPence: 800, vatRate: 20 },
  ];

  it("takes the code off the goods, judges free delivery after it, and says the VAT included", () => {
    expect(checkoutTotals({ lines, discountPence: 749, rate: tracked48 })).toEqual({
      subtotalPence: 7490,
      discountPence: 749,
      deliveryPence: 0,
      totalPence: 6741,
      // The 20% goods, £29.90 less their share of the code (£2.99), carry a sixth of £26.91.
      vatPence: 449,
    });
  });

  it("charges delivery when the code takes the goods under the free-over amount", () => {
    const totals = checkoutTotals({ lines: [{ totalPence: 4200, vatRate: 20 }], discountPence: 420, rate: tracked48 });

    expect(totals.deliveryPence).toBe(395);
    expect(totals.totalPence).toBe(3780 + 395);
  });

  it("shares delivery's VAT between the rates by the goods' value", () => {
    const totals = checkoutTotals({ lines: [{ totalPence: 1000, vatRate: 20 }, { totalPence: 1000, vatRate: 0 }], discountPence: 0, rate: tracked24 });

    // Half the £5.50 goes with the 20% goods: a sixth of £12.75.
    expect(totals).toMatchObject({ deliveryPence: 550, totalPence: 2550, vatPence: 213 });
  });

  it("leaves delivery out until an option is chosen", () => {
    expect(checkoutTotals({ lines, discountPence: 0, rate: null })).toMatchObject({ deliveryPence: null, totalPence: 7490 });
  });

  it("is all whole pence", () => {
    const totals = checkoutTotals({ lines: [{ totalPence: 333, vatRate: 20 }, { totalPence: 1, vatRate: 5 }], discountPence: 7, rate: tracked24 });

    for (const value of Object.values(totals)) expect(Number.isInteger(value)).toBe(true);
  });
});
